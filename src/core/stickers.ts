/** The finite sticker album: 24 Fluent emoji names (no streaks, no "come back tomorrow"). */
export const STICKERS = [
  'panda',
  'bear',
  'koala',
  'turtle',
  'dolphin',
  'tropical-fish',
  'octopus',
  'crab',
  'unicorn',
  'butterfly',
  'ladybug',
  'hedgehog',
  'crown',
  'glowing-star',
  'rainbow',
  'cherry-blossom',
  'sunflower',
  'strawberry',
  'watermelon',
  'birthday-cake',
  'shell',
  'sailboat',
  'desert-island',
  'gem-stone',
] as const;

export type StickerId = (typeof STICKERS)[number];
