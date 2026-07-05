export interface LocalScore {
  bacType: string;
  generalAverage: number;
  grades: Record<string, number>;
  fg: number;
  fgRegional: number;
  governorate: string;
}

const STORAGE_KEY = "localUserScore";

export function getLocalScore(): LocalScore | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LocalScore;
  } catch {
    return null;
  }
}

export function saveLocalScore(score: LocalScore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(score));
  } catch {
    // localStorage full or unavailable
  }
}

export function clearLocalScore(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // unavailable
  }
}
