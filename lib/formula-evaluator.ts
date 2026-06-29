const CODE_ALIASES: Record<string, string> = {
  A: "AR",
  FR: "F",
  Ang: "ANG",
  info: "INF",
  Inf: "INF",
  IT: "INF",
};

export const SUBJECT_LABELS: Record<string, string> = {
  FG: "المعدل العام",
  AR: "العربية",
  ANG: "الإنجليزية",
  F: "الفرنسية",
  PH: "الفيزياء",
  M: "الرياضيات",
  HG: "التاريخ والجغرافيا",
  A: "العربية",
  Algo: "الخوارزميات",
  ECO: "الإقتصاد",
  GEST: "التصرف",
  SP: "العلوم الطبيعية",
  SVT: "علوم الحياة والأرض",
  TE: "التكنولوجيا",
  INF: "الإعلامية",
  SB: "علوم الحياة",
  ALL: "المواد جميعها",
  ESP: "الإسبانية",
  STI: "العلوم التقنية",
  Spt: "الرياضة",
};

export function getRelevantCodes(formulas: string[]): string[] {
  const codes = new Set<string>();
  const re = /\b[A-Za-z]+\b/g;
  for (const f of formulas) {
    for (const m of f.matchAll(re)) {
      const code = m[0];
      if (code !== "FG" && code !== "Max") {
        codes.add(CODE_ALIASES[code] ?? code);
      }
    }
  }
  return [...codes].sort();
}

export function evaluateFormula(
  formula: string,
  grades: Record<string, number>
): number {
  let expr = formula;

  for (const [alias, canonical] of Object.entries(CODE_ALIASES)) {
    const re = new RegExp(`\\b${alias}\\b`, "g");
    expr = expr.replace(re, canonical);
  }

  expr = expr.replace(/Max\(\(([^)]+)\)\s*,\s*0\)/g, "Math.max(($1), 0)");

  expr = expr.replace(/\bFG\b/g, String(grades["FG"] ?? 0));

  const allCodes = new Set<string>();
  const codeRe = /\b[A-Za-z]+\b/g;
  for (const m of expr.matchAll(codeRe)) {
    if (m[0] !== "Math" && m[0] !== "max") allCodes.add(m[0]);
  }
  for (const code of allCodes) {
    const val = grades[code] ?? 0;
    const re = new RegExp(`\\b${code}\\b`, "g");
    expr = expr.replace(re, String(val));
  }

  try {
    const fn = new Function(`"use strict"; return (${expr})`);
    const result = fn();
    return typeof result === "number" && !Number.isNaN(result) ? result : 0;
  } catch {
    return 0;
  }
}
