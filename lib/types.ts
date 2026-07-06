export interface ChoiceCardEntry {
  code: string;
  bacType: string;
  rank: number;
}

export interface ScoreRecord {
  page: number;
  university: string;
  institution: string;
  governorate: string;
  code: string;
  license: string;
  bacType: string;
  score: number | null;
  formula?: string;
  speciality?: string[];
  duration?: number;
  notes?: string[];
  degree_fr?: string;
  university_abbreviation?: string;
  geo_bonus_eligible?: boolean;
  category?: string | null;
  university_city?: string | null;
  university_delegation?: string | null;
  university_fr?: string | null;
}
