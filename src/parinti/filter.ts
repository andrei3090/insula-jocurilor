import type { Activity, Filters } from './types';

/** Library search: every chosen filter must match; results with the closest age range first. */
export function filterActivities(list: readonly Activity[], f: Filters): Activity[] {
  return list
    .filter((a) => f.age >= a.ages[0] && f.age <= a.ages[1])
    .filter((a) => !f.where || a.where.includes(f.where))
    .filter((a) => !f.energy || a.energy === f.energy)
    .filter((a) => !f.maxMinutes || a.minutes <= f.maxMinutes)
    .filter((a) => !f.skill || a.skills.includes(f.skill))
    .sort((a, b) => a.ages[1] - a.ages[0] - (b.ages[1] - b.ages[0]) || a.title.localeCompare(b.title, 'ro'));
}
