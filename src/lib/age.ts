/** Age in full years on a reference date. `birthDate` is YYYY-MM-DD. */
export function ageOn(birthDate: string, ref: Date = new Date()): number {
  const [y, m, d] = birthDate.split("-").map(Number);
  let age = ref.getFullYear() - y;
  const beforeBirthday = ref.getMonth() + 1 < m || (ref.getMonth() + 1 === m && ref.getDate() < d);
  if (beforeBirthday) age--;
  return age;
}

export function isAgeInRange(birthDate: string, min: number, max: number, ref: Date = new Date()): boolean {
  const age = ageOn(birthDate, ref);
  return age >= min && age <= max;
}

export function formatAgeRange(min: number, max: number): string {
  return `${min}–${max} god.`;
}
