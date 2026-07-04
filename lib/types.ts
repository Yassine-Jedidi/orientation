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
}
