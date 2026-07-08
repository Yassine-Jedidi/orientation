import { getBacOptionalSubjects } from "@/lib/bac-subjects";
import { evaluateFormula } from "@/lib/formula-evaluator";
import { isGenderEligible, type Gender } from "@/lib/gender";
import {
  getScoreWithGeographicBonus,
  isGeographicBonusApplicableForRecord,
} from "@/lib/geographic-bonus";
import type { ScoreRecord } from "@/lib/types";

export type RowStatus =
  | "qualified"
  | "close"
  | "far"
  | "unavailable"
  | "gender-unavailable"
  | null;

interface EligibilityInput {
  record: ScoreRecord;
  userScore: number | null;
  userBacType: string | null;
  userGrades: Record<string, number> | null;
  userGovernorate: string | null;
  userGender: Gender | null;
  records: ScoreRecord[];
  useGeographicBonus: boolean;
}

export function getBaseScore(
  formula: string | null | undefined,
  userScore: number | null,
  userGrades: Record<string, number> | null,
) {
  if (userScore === null) return null;
  return formula && formula !== "FG"
    ? evaluateFormula(formula, { FG: userScore, ...(userGrades ?? {}) })
    : userScore;
}

export function getUnavailableOptionalSubject(
  bacType: string,
  formula: string | null | undefined,
  userBacType: string | null,
  userGrades: Record<string, number> | null,
) {
  if (!formula || userBacType !== bacType || !userGrades) return null;
  return (
    getBacOptionalSubjects(bacType).find(({ code }) => {
      const isRequired = new RegExp(`\\b${code}\\b`, "i").test(formula);
      return isRequired && userGrades[code] === undefined;
    }) ?? null
  );
}

export function getEffectiveScore({
  record,
  userScore,
  userGrades,
  userGovernorate,
  records,
  useGeographicBonus,
}: Omit<EligibilityInput, "userBacType" | "userGender">) {
  const baseScore = getBaseScore(record.formula, userScore, userGrades);
  if (baseScore === null) return null;
  return getScoreWithGeographicBonus(
    baseScore,
    record,
    isGeographicBonusApplicableForRecord(
      record,
      userGovernorate,
      records,
      useGeographicBonus,
    ),
  );
}

export function getRowStatus({
  record,
  userScore,
  userBacType,
  userGrades,
  userGovernorate,
  userGender,
  records,
  useGeographicBonus,
}: EligibilityInput): RowStatus {
  if (!isGenderEligible(record.license, userGender)) return "gender-unavailable";
  if (record.score === null) return null;
  if (userScore === null || userBacType !== record.bacType) return null;
  if (
    getUnavailableOptionalSubject(
      record.bacType,
      record.formula,
      userBacType,
      userGrades,
    )
  ) {
    return "unavailable";
  }

  const effective = getEffectiveScore({
    record,
    userScore,
    userGrades,
    userGovernorate,
    records,
    useGeographicBonus,
  });
  if (effective === null) return null;
  if (effective >= record.score) return "qualified";
  if (record.score > effective + 15) return "far";
  return "close";
}
