// Age rules. Dependency-free so `npm run check` can run it with plain Node.
//
// 13+ to sign up: under 13 triggers COPPA's verified-parental-consent regime in the US.
// Social features stay off under 18. Get legal advice before launching anything social.
export const MIN_AGE = 13;
export const ADULT_AGE = 18;

// Whole years old on `on`, from a YYYY-MM-DD date of birth. Counts the birthday itself.
export function ageOn(dateOfBirth: string, on: Date): number {
  const [y, m, d] = dateOfBirth.split("-").map(Number);
  let age = on.getFullYear() - y;
  const hadBirthday = on.getMonth() + 1 > m || (on.getMonth() + 1 === m && on.getDate() >= d);
  if (!hadBirthday) age -= 1;
  return age;
}

export const canSignUp = (dateOfBirth: string, on = new Date()) => ageOn(dateOfBirth, on) >= MIN_AGE;
export const isAdult = (dateOfBirth: string, on = new Date()) => ageOn(dateOfBirth, on) >= ADULT_AGE;
