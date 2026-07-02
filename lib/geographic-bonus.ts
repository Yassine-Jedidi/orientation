const GEOGRAPHIC_BONUS_NATIONAL_CODES = new Set([
  "101", "102", "103", "104", "105", "106", "118", "120", "122", "123",
  "124", "138", "147", "162", "167", "168", "201", "202", "207", "208",
  "209", "265", "301", "311", "312", "318", "440", "450", "452", "501",
  "502", "503", "504", "505", "507", "508", "509", "510", "512", "513",
  "523", "524", "546", "566", "568", "570", "571", "573", "588", "597",
  "600", "603", "622", "629", "672", "673", "740", "741", "743", "744",
  "750", "754", "759", "760", "797", "799", "841", "844",
]);

export const GEOGRAPHIC_BONUS_FACTOR = 1.07;

const GREATER_TUNIS_GOVERNORATES = new Set([
  "تونس",
  "أريانة",
  "بن عروس",
  "منوبة",
]);

export function isGreaterTunisGovernorate(governorate: string): boolean {
  return GREATER_TUNIS_GOVERNORATES.has(governorate);
}

/** The guide identifies eligible licences by the final three digits of their code. */
export function hasGeographicBonus(programCode: string): boolean {
  return GEOGRAPHIC_BONUS_NATIONAL_CODES.has(programCode.slice(-3));
}

export function applyGeographicBonus(score: number): number {
  return score * GEOGRAPHIC_BONUS_FACTOR;
}

/** Greater Tunis is one geographic area for the geographic bonus. */
export function isSameGeographicBonusZone(
  userGovernorate: string | null,
  institutionGovernorate: string,
): boolean {
  if (!userGovernorate) return false;
  if (userGovernorate === institutionGovernorate) return true;

  return (
    isGreaterTunisGovernorate(userGovernorate) &&
    isGreaterTunisGovernorate(institutionGovernorate)
  );
}

export function isGeographicBonusApplicable(
  programCode: string,
  userGovernorate: string | null,
  institutionGovernorate: string,
  enabled = true,
): boolean {
  return (
    enabled &&
    isSameGeographicBonusZone(userGovernorate, institutionGovernorate) &&
    hasGeographicBonus(programCode)
  );
}

export function getScoreWithGeographicBonus(
  score: number,
  programCode: string,
  enabled: boolean,
): number {
  return enabled && hasGeographicBonus(programCode)
    ? applyGeographicBonus(score)
    : score;
}
