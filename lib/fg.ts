import { getBacFormula } from "@/lib/bac-formulas";

export interface FgInput {
  bacType: string;
  generalAverage: number;
  grades: Record<string, number>;
}

export interface FgResult {
  fg: number;
  fgRegional: number;
}

export function calculateFg(input: FgInput): FgResult | null {
  const formula = getBacFormula(input.bacType);
  if (!formula || !Number.isFinite(input.generalAverage)) return null;
  if (input.generalAverage < 0 || input.generalAverage > 20) return null;

  let bonus = 0;
  let filledCount = 0;

  for (const term of formula.terms) {
    const grade = input.grades[term.code];
    if (grade === undefined) continue;
    if (!Number.isFinite(grade) || grade < 0 || grade > 20) return null;
    bonus += grade * term.coeff;
    filledCount += 1;
  }

  if (filledCount === 0) return null;

  const fg = 4 * input.generalAverage + bonus;
  return { fg, fgRegional: fg * 1.07 };
}
