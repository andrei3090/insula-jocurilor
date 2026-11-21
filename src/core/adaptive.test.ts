import { describe, expect, it } from 'vitest';
import { freshSkill, nextStep } from './adaptive';

const ok = { correct: true, hintsUsed: 0 };
const bad = { correct: false, hintsUsed: 0 };

describe('nextStep (staircase)', () => {
  it('goes up after 2 clean answers in a row', () => {
    let s = freshSkill(0);
    s = nextStep(s, ok, 4);
    expect(s.step).toBe(0);
    s = nextStep(s, ok, 4);
    expect(s.step).toBe(1);
    expect(s.okStreak).toBe(0);
  });

  it('honours a custom promoteAfter', () => {
    let s = freshSkill(0);
    for (let i = 0; i < 3; i++) s = nextStep(s, ok, 4, 4);
    expect(s.step).toBe(0);
    s = nextStep(s, ok, 4, 4);
    expect(s.step).toBe(1);
  });

  it('goes down one step on an error and resets the streak', () => {
    let s = freshSkill(2);
    s = nextStep(s, ok, 4);
    s = nextStep(s, bad, 4);
    expect(s.step).toBe(1);
    expect(s.okStreak).toBe(0);
  });

  it('goes down when the answer needed the demo (hint rung 3+)', () => {
    const s = nextStep(freshSkill(2), { correct: true, hintsUsed: 3 }, 4);
    expect(s.step).toBe(1);
  });

  it('a correct answer with a small hint keeps the step but breaks the streak', () => {
    let s = nextStep(freshSkill(1), ok, 4);
    s = nextStep(s, { correct: true, hintsUsed: 1 }, 4);
    expect(s.step).toBe(1);
    expect(s.okStreak).toBe(0);
  });

  it('caps at 0 and at maxStep', () => {
    expect(nextStep(freshSkill(0), bad, 4).step).toBe(0);
    let s = freshSkill(4);
    s = nextStep(nextStep(s, ok, 4), ok, 4);
    expect(s.step).toBe(4);
  });

  it('keeps the last 10 results', () => {
    let s = freshSkill(0);
    for (let i = 0; i < 14; i++) s = nextStep(s, i % 2 ? ok : bad, 9, 99);
    expect(s.recent).toHaveLength(10);
  });
});
