export type SkillState = { step: number; okStreak: number; recent: boolean[] };

export type Outcome = { correct: boolean; hintsUsed: number };

export const freshSkill = (step = 0): SkillState => ({ step, okStreak: 0, recent: [] });

/**
 * Staircase: `promoteAfter` clean answers in a row (correct, no hints) → one step up.
 * A wrong answer, or one that needed the demo (hint rung ≥ 3) → one step down.
 * A correct answer with a small hint keeps the step and breaks the streak.
 */
export function nextStep(s: SkillState, r: Outcome, maxStep: number, promoteAfter = 2): SkillState {
  const recent = [...s.recent, r.correct].slice(-10);
  if (!r.correct || r.hintsUsed >= 3) {
    return { step: Math.max(0, s.step - 1), okStreak: 0, recent };
  }
  if (r.hintsUsed > 0) return { step: s.step, okStreak: 0, recent };
  const okStreak = s.okStreak + 1;
  if (okStreak >= promoteAfter) return { step: Math.min(maxStep, s.step + 1), okStreak: 0, recent };
  return { step: s.step, okStreak, recent };
}

export const accuracy = (s: SkillState) =>
  s.recent.length ? s.recent.filter(Boolean).length / s.recent.length : null;
