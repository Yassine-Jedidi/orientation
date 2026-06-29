export interface FormulaTerm {
  label: string;
  code: string;
  coeff: number;
}

export interface FormulaParts {
  terms: FormulaTerm[];
}

export const BAC_FORMULAS: Record<string, FormulaParts> = {
  "آداب": {
    terms: [
      { label: "A", code: "AR", coeff: 1.5 },
      { label: "PH", code: "PHILO", coeff: 1.5 },
      { label: "HG", code: "HG", coeff: 1 },
      { label: "F", code: "F", coeff: 1 },
      { label: "Ang", code: "ANG", coeff: 1 },
    ],
  },
  "رياضيات": {
    terms: [
      { label: "M", code: "M", coeff: 2 },
      { label: "SP", code: "PHYS", coeff: 1.5 },
      { label: "SVT", code: "SVT", coeff: 0.5 },
      { label: "F", code: "F", coeff: 1 },
      { label: "Ang", code: "ANG", coeff: 1 },
    ],
  },
  "علوم تجريبية": {
    terms: [
      { label: "M", code: "M", coeff: 1 },
      { label: "SP", code: "PHYS", coeff: 1.5 },
      { label: "SVT", code: "SVT", coeff: 1.5 },
      { label: "F", code: "F", coeff: 1 },
      { label: "Ang", code: "ANG", coeff: 1 },
    ],
  },
  "إقتصاد وتصرف": {
    terms: [
      { label: "Ec", code: "ECO", coeff: 1.5 },
      { label: "Ge", code: "GEST", coeff: 1.5 },
      { label: "M", code: "M", coeff: 0.5 },
      { label: "HG", code: "HG", coeff: 0.5 },
      { label: "F", code: "F", coeff: 1 },
      { label: "Ang", code: "ANG", coeff: 1 },
    ],
  },
  "العلوم التقنية": {
    terms: [
      { label: "TE", code: "TECH", coeff: 1.5 },
      { label: "M", code: "M", coeff: 1.5 },
      { label: "SP", code: "PHYS", coeff: 1 },
      { label: "F", code: "F", coeff: 1 },
      { label: "Ang", code: "ANG", coeff: 1 },
    ],
  },
  "علوم الإعلامية": {
    terms: [
      { label: "M", code: "M", coeff: 1.5 },
      { label: "Algo", code: "ALGO", coeff: 1.5 },
      { label: "SP", code: "PHYS", coeff: 0.5 },
      { label: "STI", code: "STI", coeff: 0.5 },
      { label: "F", code: "F", coeff: 1 },
      { label: "Ang", code: "ANG", coeff: 1 },
    ],
  },
  "رياضة": {
    terms: [
      { label: "SB", code: "SVT", coeff: 1.5 },
      { label: "Sp-sport", code: "SP_PRAT", coeff: 1 },
      { label: "EP", code: "EP", coeff: 0.5 },
      { label: "SP", code: "PHYS", coeff: 0.5 },
      { label: "PH", code: "PHILO", coeff: 0.5 },
      { label: "F", code: "F", coeff: 1 },
      { label: "Ang", code: "ANG", coeff: 1 },
    ],
  },
};

export function getBacFormula(bacType: string): FormulaParts | null {
  return BAC_FORMULAS[bacType] ?? null;
}

export const ABBREVIATIONS: Record<string, string> = {
  FG: "Formule Globale",
  MG: "Moyenne Générale",
  M: "Mathématiques",
  SP: "Sciences Physiques",
  SVT: "Sciences de la Vie et de la Terre",
  F: "Français",
  Ang: "Anglais",
  A: "Arabe",
  PH: "Philosophie",
  HG: "Histoire Géographie",
  Ec: "Économie",
  Ge: "Gestion",
  TE: "Technologie",
  Algo: "Algorithmique",
  STI: "Systèmes d'Information",
  SB: "Sciences Biologiques",
  EP: "Éducation Physique",
  "Sp-sport": "Sport Pratique",
};
