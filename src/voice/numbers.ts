import type { Lang } from '../i18n/lang';
import type { LineId } from './lines';

/** Clip sequence that says a number 0–100: Romanian 27 → douăzeci, și, șapte; English 27 → twenty, seven. */
export function numberLine(n: number, lang: Lang = 'ro'): LineId[] {
  if (!Number.isInteger(n) || n < 0 || n > 100) throw new RangeError(`numberLine: ${n}`);
  if (n <= 20 || n % 10 === 0) return [`num.${n}` as LineId];
  const tens = n - (n % 10);
  if (lang === 'en') return [`num.${tens}` as LineId, `num.${n % 10}` as LineId];
  return [`num.${tens}` as LineId, 'si', `num.${n % 10}` as LineId];
}
