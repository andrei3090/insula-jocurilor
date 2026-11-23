import type { ComponentType, LazyExoticComponent } from 'react';
import type { Lang } from '../i18n/lang';
import type { LineId } from '../voice/lines';
import type { LevelSpec } from './levels';

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
  /** level 1…50 (1 for games without levels) */
  n: number;
  /** the game's own knobs for this level (from manifest.levelSpec) */
  spec: LevelSpec;
  /** the language the child plays in */
  lang: Lang;
};

export type Speakable = LineId | readonly LineId[] | { text: string };

/** queue: wait for the current sentence (default); now: an answer to the child's own tap; idle: decoration. */
export type SayMode = 'queue' | 'now' | 'idle';

export type VoiceApi = {
  /** speak once */
  say(x: Speakable, mode?: SayMode): Promise<void>;
  /** speak and remember it as the current instruction (the 🔊 button repeats it) */
  prompt(x: Speakable, mode?: SayMode): Promise<void>;
  repeat(): Promise<void>;
  stop(): void;
};

export type HintRung = 0 | 1 | 2 | 3 | 4;

/** 1 = repeat the instruction, 2 = highlight the answer, 3 = demonstrate, 4 = errorless choice. */
export type HintLadder = { rung: HintRung; next(): void; reset(): void };

export type TestHooks = { solve(): void; fail(): void; level?(n: number): void };

export type GameProps = {
  level: SkillLevel;
  /**
   * Report one finished item (first-try = correct). The host scores it, moves the beads and praises;
   * the promise resolves when the praise is over, so the game shows the next item after it.
   */
  onItem(r: ItemResult): Promise<void>;
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
  /** levels 1…50: what level n means for this game (games without it have no levels) */
  levelSpec?: (n: number) => LevelSpec;
};

export type LoadedGame = GameManifest & { Component: LazyExoticComponent<ComponentType<GameProps>> };
