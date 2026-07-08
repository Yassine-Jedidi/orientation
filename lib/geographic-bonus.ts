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

const GOVERNORATE_COORDINATES: Record<string, [number, number]> = {
  "تونس": [36.8065, 10.1815],
  "أريانة": [36.8665, 10.1647],
  "بن عروس": [36.7531, 10.2189],
  "منوبة": [36.8080, 10.0972],
  "نابل": [36.4513, 10.7350],
  "زغوان": [36.4029, 10.1429],
  "بنزرت": [37.2744, 9.8739],
  "باجة": [36.7256, 9.1817],
  "جندوبة": [36.5011, 8.7802],
  "الكاف": [36.1742, 8.7049],
  "سليانة": [36.0840, 9.3708],
  "سوسة": [35.8256, 10.6360],
  "المنستير": [35.7643, 10.8113],
  "المهدية": [35.5047, 11.0622],
  "صفاقس": [34.7406, 10.7603],
  "القيروان": [35.6781, 10.0963],
  "القصرين": [35.1676, 8.8365],
  "سيدي بوزيد": [35.0382, 9.4858],
  "قابس": [33.8815, 10.0982],
  "مدنين": [33.3549, 10.5055],
  "تطاوين": [32.9297, 10.4518],
  "قفصة": [34.4250, 8.7842],
  "توزر": [33.9197, 8.1335],
  "قبلي": [33.7044, 8.9690],
};

export function isGreaterTunisGovernorate(governorate: string): boolean {
  return GREATER_TUNIS_GOVERNORATES.has(governorate);
}

export function getNationalLicenseCode(code: string): string {
  return code.slice(-3);
}

export function hasGeographicBonus(
  input: string | { code?: string; geo_bonus_eligible?: boolean },
): boolean {
  if (typeof input === "string") {
    return GEOGRAPHIC_BONUS_NATIONAL_CODES.has(input.slice(-3));
  }
  if (input.geo_bonus_eligible !== undefined) return input.geo_bonus_eligible;
  if (!input.code) return false;
  return GEOGRAPHIC_BONUS_NATIONAL_CODES.has(getNationalLicenseCode(input.code));
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
  input: string | { code?: string; geo_bonus_eligible?: boolean },
  userGovernorate: string | null,
  institutionGovernorate: string,
  enabled = true,
): boolean {
  return (
    enabled &&
    isSameGeographicBonusZone(userGovernorate, institutionGovernorate) &&
    hasGeographicBonus(input)
  );
}

export function getScoreWithGeographicBonus(
  score: number,
  input: string | { code?: string; geo_bonus_eligible?: boolean },
  enabled: boolean,
): number {
  return enabled && hasGeographicBonus(input)
    ? applyGeographicBonus(score)
    : score;
}

function distanceBetweenGovernorates(a: string, b: string): number {
  const first = GOVERNORATE_COORDINATES[a];
  const second = GOVERNORATE_COORDINATES[b];
  if (!first || !second) return Number.POSITIVE_INFINITY;
  const [lat1, lon1] = first;
  const [lat2, lon2] = second;
  return Math.hypot(lat1 - lat2, lon1 - lon2);
}

export function isGeographicBonusApplicableForRecord<T extends {
  code: string;
  governorate: string;
  geo_bonus_eligible?: boolean;
}>(
  record: T,
  userGovernorate: string | null,
  records: T[],
  enabled = true,
): boolean {
  if (!enabled || !userGovernorate || !hasGeographicBonus(record)) return false;
  if (isSameGeographicBonusZone(userGovernorate, record.governorate)) return true;

  const nationalCode = getNationalLicenseCode(record.code);
  const candidates = records.filter(
    (item) =>
      getNationalLicenseCode(item.code) === nationalCode &&
      hasGeographicBonus(item),
  );

  if (
    candidates.some((item) =>
      isSameGeographicBonusZone(userGovernorate, item.governorate),
    )
  ) {
    return false;
  }

  const nearestDistance = Math.min(
    ...candidates.map((item) =>
      distanceBetweenGovernorates(userGovernorate, item.governorate),
    ),
  );
  const currentDistance = distanceBetweenGovernorates(
    userGovernorate,
    record.governorate,
  );

  return (
    Number.isFinite(currentDistance) &&
    Math.abs(currentDistance - nearestDistance) < 0.000001
  );
}
