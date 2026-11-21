import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { createArbiter } from './arbiter';
import { type InkPoint, outlineToSvgPath, strokeOutline } from './ink';

export type InkTool = 'pen' | 'eraser' | 'rainbow';

export type Stroke = {
  kind: 'stroke';
  tool: InkTool;
  color: string;
  size: number;
  isPen: boolean;
  points: InkPoint[];
  clip?: Path2D | null;
};
export type Stamp = { kind: 'stamp'; src: string; x: number; y: number; size: number };
export type InkItem = Stroke | Stamp;

type Paint = (ctx: CanvasRenderingContext2D, w: number, h: number) => void | Promise<void>;

export type InkHandle = {
  undo(): void;
  clear(): void;
  addStamp(src: string, x: number, y: number, size: number): void;
  items(): InkItem[];
  toBlob(layers?: { under?: Paint; over?: Paint }): Promise<Blob | null>;
};

type Props = {
  tool?: InkTool;
  color?: string;
  size?: number;
  disabled?: boolean;
  className?: string;
  label?: string;
  /** called when a stroke starts; return a clip path to keep the stroke inside a region */
  clipAt?: (x: number, y: number) => Path2D | null;
  onStrokeStart?(p: InkPoint, isPen: boolean): void;
  onStrokeMove?(p: InkPoint): void;
  onStrokeEnd?(s: Stroke): void;
  /** keep strokes on the canvas (false: the game clears them itself, e.g. tracing) */
  persist?: boolean;
};

const RAINBOW = ['#ff5f6d', '#ffa24c', '#ffd84c', '#6fd36f', '#4cc9f0', '#7b6cff', '#d86cff'];
const images = new Map<string, HTMLImageElement>();
const ctxOf = (c: HTMLCanvasElement | null) => c?.getContext('2d') ?? null;

function stampImage(src: string, onLoad: () => void) {
  let img = images.get(src);
  if (!img) {
    img = new Image();
    img.decoding = 'async';
    img.src = src;
    images.set(src, img);
  }
  if (!img.complete) img.addEventListener('load', onLoad, { once: true });
  return img;
}

function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke) {
  const path = new Path2D(outlineToSvgPath(strokeOutline(s.points, s.size, s.isPen)));
  ctx.save();
  if (s.clip) ctx.clip(s.clip);
  if (s.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#000';
  } else if (s.tool === 'rainbow') {
    const xs = s.points.map((p) => p[0]);
    const ys = s.points.map((p) => p[1]);
    const g = ctx.createLinearGradient(
      Math.min(...xs),
      Math.min(...ys),
      Math.max(...xs) + 1,
      Math.max(...ys) + 1,
    );
    RAINBOW.forEach((c, i) => {
      g.addColorStop(i / (RAINBOW.length - 1), c);
    });
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = s.color;
  }
  ctx.fill(path);
  ctx.restore();
}

export const InkCanvas = forwardRef<InkHandle, Props>(function InkCanvas(
  {
    tool = 'pen',
    color = '#3b2a4a',
    size = 14,
    disabled,
    className,
    label = 'Foaie de desen',
    clipAt,
    onStrokeStart,
    onStrokeMove,
    onStrokeEnd,
    persist = true,
  },
  ref,
) {
  const wrap = useRef<HTMLDivElement>(null);
  const base = useRef<HTMLCanvasElement>(null);
  const live = useRef<HTMLCanvasElement>(null);
  const items = useRef<InkItem[]>([]);
  const current = useRef<Stroke | null>(null);
  const snapshot = useRef<HTMLCanvasElement | null>(null);
  const raf = useRef(0);
  const dims = useRef({ w: 0, h: 0, dpr: 1 });
  const props = useRef({
    tool,
    color,
    size,
    disabled,
    clipAt,
    onStrokeStart,
    onStrokeMove,
    onStrokeEnd,
    persist,
  });
  props.current = { tool, color, size, disabled, clipAt, onStrokeStart, onStrokeMove, onStrokeEnd, persist };

  const redrawBase = useCallback(() => {
    const ctx = ctxOf(base.current);
    if (!ctx) return;
    const { w, h } = dims.current;
    ctx.clearRect(0, 0, w, h);
    for (const it of items.current) {
      if (it.kind === 'stroke') drawStroke(ctx, it);
      else {
        const img = stampImage(it.src, redrawBase);
        if (img.complete) ctx.drawImage(img, it.x - it.size / 2, it.y - it.size / 2, it.size, it.size);
      }
    }
  }, []);

  const frame = useCallback(() => {
    raf.current = 0;
    const s = current.current;
    const lctx = ctxOf(live.current);
    if (!lctx) return;
    const { w, h } = dims.current;
    lctx.clearRect(0, 0, w, h);
    if (!s) return;
    if (s.tool === 'eraser') {
      // erase live on the base layer, from the snapshot taken at stroke start
      const bctx = ctxOf(base.current);
      if (bctx && snapshot.current) {
        bctx.save();
        bctx.setTransform(1, 0, 0, 1, 0, 0);
        bctx.clearRect(0, 0, bctx.canvas.width, bctx.canvas.height);
        bctx.drawImage(snapshot.current, 0, 0);
        bctx.restore();
        drawStroke(bctx, s);
      }
    } else {
      drawStroke(lctx, s);
    }
  }, []);

  const schedule = useCallback(() => {
    if (!raf.current) raf.current = requestAnimationFrame(frame);
  }, [frame]);

  useImperativeHandle(
    ref,
    () => ({
      undo() {
        items.current.pop();
        redrawBase();
      },
      clear() {
        items.current = [];
        redrawBase();
      },
      addStamp(src, x, y, s) {
        items.current.push({ kind: 'stamp', src, x, y, size: s });
        redrawBase();
      },
      items: () => [...items.current],
      async toBlob(layers) {
        const b = base.current;
        if (!b) return null;
        const out = document.createElement('canvas');
        out.width = b.width;
        out.height = b.height;
        const ctx = out.getContext('2d')!;
        const { w, h, dpr } = dims.current;
        ctx.scale(dpr, dpr);
        ctx.fillStyle = '#fffaf2';
        ctx.fillRect(0, 0, w, h);
        await layers?.under?.(ctx, w, h);
        ctx.drawImage(b, 0, 0, w, h);
        await layers?.over?.(ctx, w, h);
        return new Promise((res) => out.toBlob((bl) => res(bl), 'image/png'));
      },
    }),
    [redrawBase],
  );

  // size the canvases to the container, DPR-scaled
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      dims.current = { w: r.width, h: r.height, dpr };
      for (const c of [base.current, live.current]) {
        if (!c) continue;
        c.width = Math.round(r.width * dpr);
        c.height = Math.round(r.height * dpr);
        c.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      redrawBase();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [redrawBase]);

  // pointer input: native, non-passive listeners
  useEffect(() => {
    const c = live.current;
    if (!c) return;
    let rect = c.getBoundingClientRect();
    const arbiter = createArbiter({
      onPreempt: () => {
        current.current = null; // palm stroke dropped
        schedule();
      },
    });
    const pt = (e: PointerEvent): InkPoint => [
      e.clientX - rect.left,
      e.clientY - rect.top,
      e.pointerType === 'pen' ? Math.max(0.05, e.pressure || 0.5) : 0.5,
    ];

    const down = (e: PointerEvent) => {
      const p = props.current;
      if (p.disabled || !arbiter.accept(e)) return;
      e.preventDefault();
      rect = c.getBoundingClientRect();
      try {
        c.setPointerCapture(e.pointerId);
      } catch {
        /* synthetic events */
      }
      const first = pt(e);
      const isPen = e.pointerType === 'pen';
      if (p.tool === 'eraser' && base.current) {
        const snap = document.createElement('canvas');
        snap.width = base.current.width;
        snap.height = base.current.height;
        snap.getContext('2d')?.drawImage(base.current, 0, 0);
        snapshot.current = snap;
      }
      current.current = {
        kind: 'stroke',
        tool: p.tool,
        color: p.color,
        size: isPen ? p.size * 1.15 : p.size,
        isPen,
        points: [first],
        clip: p.clipAt?.(first[0], first[1]) ?? null,
      };
      p.onStrokeStart?.(first, isPen);
      schedule();
    };
    const move = (e: PointerEvent) => {
      const s = current.current;
      if (!s || !arbiter.accept(e)) return;
      e.preventDefault();
      const evs = e.getCoalescedEvents?.() ?? [];
      for (const ce of evs.length ? evs : [e]) {
        const q = pt(ce);
        s.points.push(q);
        props.current.onStrokeMove?.(q);
      }
      schedule();
    };
    const up = (e: PointerEvent) => {
      if (!arbiter.accept(e)) return;
      const s = current.current;
      current.current = null;
      snapshot.current = null;
      if (!s) return;
      if (e.type === 'pointerup' && props.current.persist) {
        items.current.push(s);
        const bctx = ctxOf(base.current);
        if (bctx && s.tool !== 'eraser') drawStroke(bctx, s);
      } else if (s.tool === 'eraser') {
        redrawBase();
      }
      schedule();
      if (e.type === 'pointerup') props.current.onStrokeEnd?.(s);
    };
    const stopTouch = (e: TouchEvent) => e.preventDefault(); // iPad Scribble + scroll

    c.addEventListener('pointerdown', down, { passive: false });
    c.addEventListener('pointermove', move, { passive: false });
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('touchstart', stopTouch, { passive: false });
    c.addEventListener('touchmove', stopTouch, { passive: false });
    return () => {
      c.removeEventListener('pointerdown', down);
      c.removeEventListener('pointermove', move);
      c.removeEventListener('pointerup', up);
      c.removeEventListener('pointercancel', up);
      c.removeEventListener('touchstart', stopTouch);
      c.removeEventListener('touchmove', stopTouch);
      cancelAnimationFrame(raf.current);
    };
  }, [schedule, redrawBase]);

  return (
    <div ref={wrap} className={`ink-surface relative ${className ?? ''}`} role="img" aria-label={label}>
      <canvas ref={base} className="pointer-events-none absolute inset-0 h-full w-full" />
      <canvas ref={live} data-testid="ink-live" className="ink-surface absolute inset-0 h-full w-full" />
    </div>
  );
});
