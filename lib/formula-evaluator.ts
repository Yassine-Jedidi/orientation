const CODE_ALIASES: Record<string, string> = {
  A: "AR",
  FR: "F",
  Ang: "ANG",
  info: "INF",
  Inf: "INF",
  SP: "PHYS",
  PH: "PHILO",
  Algo: "ALGO",
  TE: "TECH",
  SB: "SVT",
  Spt: "SPT",
};

export const SUBJECT_LABELS: Record<string, string> = {
  FG: "المعدل العام",
  AR: "العربية",
  ANG: "الإنجليزية",
  F: "الفرنسية",
  PH: "الفلسفة",
  M: "الرياضيات",
  HG: "التاريخ والجغرافيا",
  A: "العربية",
  Algo: "الخوارزميات",
  ECO: "الإقتصاد",
  GEST: "التصرف",
  SP: "الفيزياء",
  SVT: "علوم الحياة والأرض",
  TE: "التكنولوجيا",
  INF: "الإعلامية",
  SB: "علوم الحياة",
  ALL: "الألمانية",
  ESP: "الإسبانية",
  IT: "الإيطالية",
  RU: "الروسية",
  ZH: "الصينية",
  TR: "التركية",
  PT: "البرتغالية",
  MUSIC: "التربية الموسيقية",
  ART: "التربية التشكيلية",
  HIST: "التاريخ",
  GEO: "الجغرافيا",
  OPT: "المادة الاختيارية",
  STI: "العلوم التقنية",
  Spt: "الرياضة",
  SPT: "الرياضة",
};

export function getRelevantCodes(formulas: string[]): string[] {
  const codes = new Set<string>();
  const re = /\b[A-Za-z]+\b/g;
  for (const f of formulas) {
    const normalized = f.replace(/(\d+)([A-Za-z]\w*)/g, "$1*$2");
    for (const m of normalized.matchAll(re)) {
      const code = m[0];
      if (code !== "FG" && code !== "Max") {
        codes.add(CODE_ALIASES[code] ?? code);
      }
    }
  }
  return [...codes].sort();
}

export function getFormulaCalculation(
  formula: string,
  grades: Record<string, number>,
): { substituted: string; result: number } | null {
  let missing = false;
  const readableFormula = formula.replace(/(\d+)([A-Za-z])/g, "$1×$2");
  const substituted = readableFormula.replace(/\b[A-Za-z]+\b/g, (rawCode) => {
    if (rawCode === "Max") return rawCode;
    const code = rawCode === "FG" ? "FG" : (CODE_ALIASES[rawCode] ?? rawCode);
    const value = grades[code];
    if (value === undefined || !Number.isFinite(value)) {
      missing = true;
      return rawCode;
    }
    return Number(value).toFixed(2);
  });
  if (missing) return null;

  const result = evaluateFormula(formula, grades);
  return result === null ? null : { substituted, result };
}

export function evaluateFormula(
  formula: string,
  grades: Record<string, number>
): number | null {
  // Split implicit coefficients before normalizing aliases so terms such as
  // `2Ang` and `2Algo` expose `Ang`/`Algo` as complete tokens.
  let expr = formula.replace(/(\d+)([A-Za-z]\w*)/g, "$1*$2");

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
    const val = grades[code];
    if (val === undefined || !Number.isFinite(val)) return null;
    const re = new RegExp(`\\b${code}\\b`, "g");
    expr = expr.replace(re, String(val));
  }

  try {
    const fn = new Function(`"use strict"; return (${expr})`);
    const result = fn();
    return typeof result === "number" && Number.isFinite(result) ? result : null;
  } catch {
    return null;
  }
}
