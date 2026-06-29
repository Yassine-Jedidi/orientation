export interface SubjectCoeff {
  code: string;
  label: string;
  coeff: number;
}

export const BAC_COEFFICIENTS: Record<string, SubjectCoeff[]> = {
  "رياضيات": [
    { code: "M", label: "الرياضيات", coeff: 4 },
    { code: "PHYS", label: "العلوم الفيزيائية", coeff: 4 },
    { code: "SVT", label: "علوم الحياة والأرض", coeff: 1 },
    { code: "F", label: "الفرنسية", coeff: 1 },
    { code: "ANG", label: "الإنجليزية", coeff: 1 },
    { code: "PHILO", label: "الفلسفة", coeff: 1 },
    { code: "AR", label: "العربية", coeff: 1 },
    { code: "INF", label: "الإعلامية", coeff: 1 },
    { code: "SPT", label: "الرياضة", coeff: 1 },
  ],
  "علوم تجريبية": [
    { code: "SVT", label: "علوم الحياة والأرض", coeff: 4 },
    { code: "PHYS", label: "العلوم الفيزيائية", coeff: 4 },
    { code: "M", label: "الرياضيات", coeff: 3 },
    { code: "F", label: "الفرنسية", coeff: 1 },
    { code: "ANG", label: "الإنجليزية", coeff: 1 },
    { code: "PHILO", label: "الفلسفة", coeff: 1 },
    { code: "AR", label: "العربية", coeff: 1 },
    { code: "INF", label: "الإعلامية", coeff: 1 },
    { code: "SPT", label: "الرياضة", coeff: 1 },
  ],
  "علوم الإعلامية": [
    { code: "ALGO", label: "الخوارزميات والبرمجة", coeff: 3 },
    { code: "M", label: "الرياضيات", coeff: 3 },
    { code: "STI", label: "أنظمة المعلومات", coeff: 3 },
    { code: "PHYS", label: "العلوم الفيزيائية", coeff: 2 },
    { code: "F", label: "الفرنسية", coeff: 1 },
    { code: "ANG", label: "الإنجليزية", coeff: 1 },
    { code: "PHILO", label: "الفلسفة", coeff: 1 },
    { code: "AR", label: "العربية", coeff: 1 },
    { code: "SPT", label: "الرياضة", coeff: 1 },
  ],
  "العلوم التقنية": [
    { code: "TECH", label: "التكنولوجيا", coeff: 3 },
    { code: "M", label: "الرياضيات", coeff: 3 },
    { code: "PHYS", label: "العلوم الفيزيائية", coeff: 3 },
    { code: "TP", label: "التطبيقات التكنولوجية", coeff: 1 },
    { code: "F", label: "الفرنسية", coeff: 1 },
    { code: "ANG", label: "الإنجليزية", coeff: 1 },
    { code: "PHILO", label: "الفلسفة", coeff: 1 },
    { code: "AR", label: "العربية", coeff: 1 },
    { code: "INF", label: "الإعلامية", coeff: 1 },
    { code: "SPT", label: "الرياضة", coeff: 1 },
  ],
  "إقتصاد وتصرف": [
    { code: "ECO", label: "الإقتصاد", coeff: 3 },
    { code: "GEST", label: "التصرف", coeff: 3 },
    { code: "M", label: "الرياضيات", coeff: 2 },
    { code: "HG", label: "التاريخ والجغرافيا", coeff: 2 },
    { code: "F", label: "الفرنسية", coeff: 1 },
    { code: "ANG", label: "الإنجليزية", coeff: 1 },
    { code: "PHILO", label: "الفلسفة", coeff: 1 },
    { code: "AR", label: "العربية", coeff: 1 },
    { code: "INF", label: "الإعلامية", coeff: 1 },
    { code: "SPT", label: "الرياضة", coeff: 1 },
  ],
  "آداب": [
    { code: "AR", label: "العربية", coeff: 4 },
    { code: "PHILO", label: "الفلسفة", coeff: 3 },
    { code: "HG", label: "التاريخ والجغرافيا", coeff: 2 },
    { code: "F", label: "الفرنسية", coeff: 2 },
    { code: "ANG", label: "الإنجليزية", coeff: 2 },
    { code: "ISL", label: "الفكر الإسلامي", coeff: 1 },
    { code: "INF", label: "الإعلامية", coeff: 1 },
    { code: "SPT", label: "الرياضة", coeff: 1 },
  ],
  "رياضة": [
    { code: "SVT", label: "علوم الحياة والأرض", coeff: 3 },
    { code: "SP_PRAT", label: "الرياضة التطبيقية", coeff: 2.5 },
    { code: "F", label: "الفرنسية", coeff: 1.5 },
    { code: "PHILO", label: "الفلسفة", coeff: 1.5 },
    { code: "ANG", label: "الإنجليزية", coeff: 1.5 },
    { code: "M", label: "الرياضيات", coeff: 1 },
    { code: "PHYS", label: "العلوم الفيزيائية", coeff: 1 },
    { code: "AR", label: "العربية", coeff: 1 },
    { code: "EP", label: "التربية البدنية", coeff: 1 },
    { code: "SP_THEO", label: "الرياضة النظرية", coeff: 0.5 },
  ],
};

export function getBacCoefficients(bacType: string): SubjectCoeff[] {
  return BAC_COEFFICIENTS[bacType] ?? [];
}
