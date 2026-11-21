import type { ComponentType, LazyExoticComponent } from 'react';
import type { LineId } from '../voice/lines';

export type IslandId = 'bambus' | 'pestera' | 'castel' | 'laguna' | 'atelier';
export type SkillId = string;

export type ItemResult = {
  skill: SkillId;
  correct: boolean;
  /** highest hint rung reached for this item (0 = none) */
  hintsUsed: number;
  ms: number;
  /** stable id of the item (a letter, a number fact) for spaced review */
  itemId?: string;
};

export type SkillLevel = {
  /** current skill id, manifest.skills[step] */
  skill: SkillId;
  step: number;
  /** age of the active profile (4–10), for tolerances and copy */
  age: number;
};

export type Speakable = LineId | readonly LineId[] | { text: string };

export type VoiceApi = {
  /** speak once */
  say(x: Speakable): Promise<void>;
  /** speak and remember it as the current instruction (the 🔊 button repeats it) */
  prompt(x: Speakable): Promise<void>;
  repeat(): Promise<void>;
  stop(): void;
};

export type HintRung = 0 | 1 | 2 | 3 | 4;

/** 1 = repeat the instruction, 2 = highlight the answer, 3 = demonstrate, 4 = errorless choice. */
export type HintLadder = { rung: HintRung; next(): void; reset(): void };

export type TestHooks = { solve(): void; fail(): void };

export type GameProps = {
  level: SkillLevel;
  /** report one finished item; the host scores it and moves the beads */
  onItem(r: ItemResult): void;
  /** the game itself decides the round is over (unscored games: "Gata!" button) */
  onRoundEnd(): void;
  voice: VoiceApi;
  hints: HintLadder;
  /** register test hooks (dev and test builds only) */
  registerTest(h: TestHooks | null): void;
  /** profile id, for saving drawings to the album */
  profileId: string;
};

export type GameManifest = {
  id: string;
  title: string;
  titleVoice: LineId;
  island: IslandId;
  ages: readonly [number, number];
  /** ordered easy → hard; the staircase step indexes this list */
  skills: readonly SkillId[];
  icon: ComponentType<{ size?: number }>;
  load: () => Promise<{ default: ComponentType<GameProps> }>;
  roundSize?: number;
  scored?: boolean;
  promoteAfter?: number;
  /** starting step for a new profile of this age */
  startStep?: (age: number) => number;
};

export type LoadedGame = GameManifest & { Component: LazyExoticComponent<ComponentType<GameProps>> };
