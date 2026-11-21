import { motion } from 'motion/react';
import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { GUIDES } from '../../art/guides';
import { IslandArt } from '../../art/islands';
import { sfx } from '../../audio/sfx';
import { saveDrawing } from '../../core/drawings';
import type { Avatar } from '../../core/profile';
import type { GameProps, IslandId } from '../../core/types';
import { BigButton } from '../../ui/BigButton';
import { StarBurst } from '../../ui/Celebration';
import { CheckIcon } from '../../ui/icons';
import { POTS } from '../desen/logic';
import { applyFill, type Fill, isRegion } from './logic';

type Page = { id: string; kind: 'guide' | 'island' };

const PAGES: Page[] = [
  ...Object.keys(GUIDES).map((id) => ({ id, kind: 'guide' as const })),
  ...(['castel', 'bambus', 'laguna'] as IslandId[]).map((id) => ({ id, kind: 'island' as const })),
];

function PageArt({ page, size }: { page: Page; size: number }) {
  if (page.kind === 'island') return <IslandArt id={page.id as IslandId} width={size} />;
  const G = GUIDES[page.id as Avatar];
  return <G size={size} mood="idle" />;
}

const WHITE = '#ffffff';
const PALETTE = [...POTS, { id: 'white', color: WHITE, voice: 'color.white' as const }];

/** Turns any of our SVG drawings into a colouring page (rendered once, then edited in the DOM). */
const Sheet = memo(function Sheet({ page, size }: { page: Page; size: number }) {
  return <PageArt page={page} size={size} />;
});

function prepare(root: HTMLElement): number {
  let n = 0;
  for (const el of root.querySelectorAll<SVGGraphicsElement>('path, circle, ellipse, rect, polygon')) {
    let area = 1000;
    try {
      const b = el.getBBox();
      area = b.width * b.height;
    } catch {
      /* not rendered */
    }
    if (!isRegion(el.tagName.toLowerCase(), el.getAttribute('fill'), area)) continue;
    el.dataset.region = `r${n++}`;
    el.setAttribute('fill', WHITE);
    if (!el.getAttribute('stroke') || el.getAttribute('stroke') === 'none') {
      el.setAttribute('stroke', '#3b2a4a');
      el.setAttribute('stroke-width', '2.5');
    }
    el.style.cursor = 'pointer';
  }
  return n;
}

export default function ColoreazaGame({ voice, registerTest, profileId }: GameProps) {
  const [page, setPage] = useState<Page | null>(null);
  const [color, setColor] = useState(PALETTE[0].color);
  const [history, setHistory] = useState<Fill[]>([]);
  const [saved, setSaved] = useState(0);
  const fills = useRef<Record<string, string>>({});
  const sheet = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(440);
  const area = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: prompt per screen
  useEffect(() => {
    void voice.prompt(page ? 'coloreaza.intro' : 'coloreaza.choose');
  }, [page]);

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize(Math.floor(Math.min(r.width - 140, r.height - 20)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (page && sheet.current) {
      fills.current = {};
      setHistory([]);
      prepare(sheet.current);
    }
  }, [page]);

  const paint = (target: EventTarget | null) => {
    const el = target as SVGElement | null;
    const id = el?.dataset?.region;
    if (!el || !id) return;
    const { fills: next, undo } = applyFill(fills.current, id, color);
    fills.current = next;
    el.setAttribute('fill', color);
    setHistory((h) => [...h, undo]);
    sfx.pop();
  };

  const undo = () => {
    const last = history.at(-1);
    if (!last || !sheet.current) return;
    sheet.current.querySelector(`[data-region="${last.id}"]`)?.setAttribute('fill', last.color);
    fills.current = { ...fills.current, [last.id]: last.color };
    setHistory((h) => h.slice(0, -1));
    sfx.swish();
  };

  const save = async () => {
    const svg = sheet.current?.querySelector('svg');
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(clone.outerHTML)}`;
    const img = new Image();
    img.src = url;
    await img.decode().catch(() => {});
    const c = document.createElement('canvas');
    c.width = 1000;
    c.height = 1000;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#fffaf2';
    ctx.fillRect(0, 0, 1000, 1000);
    const k = Math.min(1000 / img.width, 1000 / img.height) * 0.9 || 1;
    ctx.drawImage(
      img,
      (1000 - img.width * k) / 2,
      (1000 - img.height * k) / 2,
      img.width * k,
      img.height * k,
    );
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/png'));
    if (!blob) return;
    await saveDrawing(profileId, blob);
    sfx.success();
    setSaved((n) => n + 1);
    void voice.say('desen.saved');
  };

  registerTest({
    solve: () => {
      const first = sheet.current?.querySelector('[data-region]');
      if (first) paint(first);
      void save();
    },
    fail: () => {},
  });

  if (!page)
    return (
      <div
        ref={area}
        className="flex h-full flex-wrap content-center items-center justify-center gap-5 px-6 pb-6"
        data-testid="pages"
      >
        {PAGES.map((p, i) => (
          <motion.button
            key={p.id}
            type="button"
            aria-label={`Desen de colorat ${p.id}`}
            data-testid="page"
            onClick={() => {
              sfx.pop();
              setPage(p);
            }}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.05 }}
            whileTap={{ scale: 0.9 }}
            className="grid size-[150px] place-items-center rounded-[2rem] border-4 border-ink/70 bg-white shadow-[0_6px_0_rgba(59,42,74,0.3)]"
          >
            <PageArt page={p} size={120} />
          </motion.button>
        ))}
      </div>
    );

  return (
    <div ref={area} className="flex h-full items-center justify-center gap-4 px-4 pb-4">
      <div className="grid grid-cols-2 gap-2 portrait:grid-cols-5" data-testid="palette">
        {PALETTE.map((p) => (
          <motion.button
            key={p.id}
            type="button"
            aria-label={p.id}
            onClick={() => {
              setColor(p.color);
              void voice.say(p.voice);
            }}
            whileTap={{ scale: 0.85 }}
            animate={{ scale: color === p.color ? 1.12 : 1 }}
            className={`size-[64px] rounded-full border-4 shadow-[0_4px_0_rgba(59,42,74,0.3)] ${color === p.color ? 'border-ink' : 'border-ink/50'}`}
            style={{ background: p.color }}
          />
        ))}
      </div>
      <div
        ref={sheet}
        className="relative grid place-items-center rounded-[2rem] border-4 border-ink/70 bg-white p-2"
        style={{ width: size, height: size }}
        onPointerDown={(e) => paint(e.target)}
        data-testid="sheet"
      >
        <Sheet page={page} size={size - 30} />
        {saved > 0 && <StarBurst key={saved} />}
      </div>
      <div className="flex flex-col gap-3">
        <BigButton label="Alt desen" size={86} round onPress={() => setPage(null)}>
          <svg viewBox="0 0 64 64" width={46} height={46} aria-hidden="true">
            <rect
              x={10}
              y={10}
              width={18}
              height={18}
              rx={4}
              fill="#f8bbd0"
              stroke="#3b2a4a"
              strokeWidth={4}
            />
            <rect
              x={36}
              y={10}
              width={18}
              height={18}
              rx={4}
              fill="#bfe8ff"
              stroke="#3b2a4a"
              strokeWidth={4}
            />
            <rect
              x={10}
              y={36}
              width={18}
              height={18}
              rx={4}
              fill="#ffe3a8"
              stroke="#3b2a4a"
              strokeWidth={4}
            />
            <rect
              x={36}
              y={36}
              width={18}
              height={18}
              rx={4}
              fill="#c6f0a8"
              stroke="#3b2a4a"
              strokeWidth={4}
            />
          </svg>
        </BigButton>
        <BigButton label="Înapoi un pas" size={86} round onPress={undo} disabled={!history.length}>
          <svg viewBox="0 0 64 64" width={44} height={44} aria-hidden="true">
            <path
              d="M24 18 L12 30 L24 42"
              fill="none"
              stroke="#3b2a4a"
              strokeWidth={6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M12 30 H38 A14 14 0 0 1 38 58 H30"
              fill="none"
              stroke="#3b2a4a"
              strokeWidth={6}
              strokeLinecap="round"
            />
          </svg>
        </BigButton>
        <BigButton
          label="Pune în album"
          size={86}
          round
          tone="lagoon"
          onPress={() => void save()}
          testId="save"
        >
          <CheckIcon size={50} />
        </BigButton>
      </div>
    </div>
  );
}
