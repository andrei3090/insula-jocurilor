import type { LineId } from './lines';

/** Clip sequence that says a number 0–100 in Romanian, e.g. 27 → douăzeci, și, șapte. */
export function numberLine(n: number): LineId[] {
  if (!Number.isInteger(n) || n < 0 || n > 100) throw new RangeError(`numberLine: ${n}`);
  if (n <= 20 || n % 10 === 0) return [`num.${n}` as LineId];
  const tens = n - (n % 10);
  return [`num.${tens}` as LineId, 'si', `num.${n % 10}` as LineId];
}
