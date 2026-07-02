export const GENDERS = ["male", "female"] as const;
export type Gender = (typeof GENDERS)[number];

export const GENDER_LABELS: Record<Gender, string> = {
  male: "ذكر",
  female: "أنثى",
};

export function isGender(value: unknown): value is Gender {
  return typeof value === "string" && GENDERS.includes(value as Gender);
}

export function getRequiredGender(license: string): Gender | null {
  if (/تمريض\s*-\s*(?:إناث|اناث)/.test(license)) return "female";
  if (/تمريض\s*-\s*ذكور/.test(license)) return "male";
  return null;
}

export function isGenderEligible(
  license: string,
  gender: Gender | null,
): boolean {
  const required = getRequiredGender(license);
  return !required || !gender || required === gender;
}
