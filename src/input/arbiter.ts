export type ArbiterEvent = {
  type: string;
  pointerType: string;
  pointerId: number;
  timeStamp: number;
  buttons: number;
};

const PALM_WINDOW_MS = 1500;

/**
 * Palm rejection for the web (there is no platform API for it):
 * - once an S Pen / Pencil is seen, finger touches are ignored while the pen is down and 1.5 s after it lifts;
 * - only one pointer draws at a time; a pen landing after a palm takes over (the palm stroke is dropped);
 * - hover moves (buttons = 0) never draw.
 */
export function createArbiter(opts: { onPreempt?: (pointerId: number) => void } = {}) {
  let penSeen = false;
  let penDown = false;
  let penUpAt = Number.NEGATIVE_INFINITY;
  let active: { id: number; type: string } | null = null;

  return {
    accept(e: ArbiterEvent): boolean {
      const isPen = e.pointerType === 'pen';
      if (e.type === 'pointermove' && e.buttons === 0) return false;
      if (!isPen && penSeen && (penDown || e.timeStamp - penUpAt < PALM_WINDOW_MS)) return false;

      if (e.type === 'pointerdown') {
        if (active && active.id !== e.pointerId) {
          if (isPen && active.type !== 'pen') {
            opts.onPreempt?.(active.id);
          } else {
            return false;
          }
        }
        active = { id: e.pointerId, type: e.pointerType };
        if (isPen) {
          penSeen = true;
          penDown = true;
        }
        return true;
      }

      if (!active || active.id !== e.pointerId) return false;
      if (e.type === 'pointerup' || e.type === 'pointercancel') {
        active = null;
        if (isPen) {
          penDown = false;
          penUpAt = e.timeStamp;
        }
      }
      return true;
    },
    get penSeen() {
      return penSeen;
    },
  };
}
