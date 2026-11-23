/** Age groups the child picks after "Hai să ne jucăm!". The exact age (parent zone) is kept inside a group. */
export type AgeGroup = 'small' | 'big';

export const groupOf = (age: number): AgeGroup => (age <= 4 ? 'small' : 'big');

/** The age to store when the child picks a group: her own age if it is in the group, else the group's start. */
export function ageFor(group: AgeGroup, current: number): number {
  if (group === 'small') return current <= 4 ? Math.max(3, current) : 4;
  return current >= 5 && current <= 7 ? current : 5;
}
