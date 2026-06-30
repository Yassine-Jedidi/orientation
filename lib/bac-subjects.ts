export interface BacSubject {
  code: string;
  label: string;
  optional?: boolean;
}

export interface OptionalSubjectChoice {
  code: string;
  label: string;
}

const LANGUAGE_OPTIONS: OptionalSubjectChoice[] = [
  { code: "ALL", label: "الألمانية" },
  { code: "ESP", label: "الإسبانية" },
  { code: "IT", label: "الإيطالية" },
  { code: "RU", label: "الروسية" },
  { code: "ZH", label: "الصينية" },
  { code: "TR", label: "التركية" },
  { code: "PT", label: "البرتغالية" },
];

const COMMON_OPTIONS: OptionalSubjectChoice[] = [
  ...LANGUAGE_OPTIONS,
  { code: "MUSIC", label: "التربية الموسيقية" },
  { code: "ART", label: "التربية التشكيلية" },
];

export const BAC_OPTIONAL_SUBJECTS: Record<string, OptionalSubjectChoice[]> = {
  "آداب": [
    ...COMMON_OPTIONS,
    { code: "SVT", label: "علوم الحياة والأرض" },
    { code: "M", label: "الرياضيات" },
  ],
  "رياضيات": COMMON_OPTIONS,
  "علوم تجريبية": COMMON_OPTIONS,
  "إقتصاد وتصرف": COMMON_OPTIONS,
  "العلوم التقنية": COMMON_OPTIONS,
  "علوم الإعلامية": COMMON_OPTIONS,
  "رياضة": [
    { code: "HIST", label: "التاريخ" },
    { code: "GEO", label: "الجغرافيا" },
    { code: "INF", label: "الإعلامية" },
  ],
};

export function getBacOptionalSubjects(bacType: string): OptionalSubjectChoice[] {
  return BAC_OPTIONAL_SUBJECTS[bacType] ?? [];
}

const OPTIONAL_SUBJECTS: BacSubject[] = [
  { code: "OPT", label: "المادة الاختيارية", optional: true },
];

export const BAC_SUBJECTS: Record<string, BacSubject[]> = {
  "آداب": [
    { code: "AR", label: "العربية" }, { code: "PHILO", label: "الفلسفة" },
    { code: "HG", label: "التاريخ والجغرافيا" }, { code: "F", label: "الفرنسية" },
    { code: "ANG", label: "الإنجليزية" }, { code: "INF", label: "الإعلامية" },
    { code: "SPT", label: "الرياضة" }, ...OPTIONAL_SUBJECTS,
  ],
  "رياضيات": [
    { code: "M", label: "الرياضيات" }, { code: "PHYS", label: "العلوم الفيزيائية" },
    { code: "SVT", label: "علوم الحياة والأرض" }, { code: "F", label: "الفرنسية" },
    { code: "ANG", label: "الإنجليزية" }, { code: "PHILO", label: "الفلسفة" },
    { code: "AR", label: "العربية" }, { code: "INF", label: "الإعلامية" },
    { code: "SPT", label: "الرياضة" }, ...OPTIONAL_SUBJECTS,
  ],
  "علوم تجريبية": [
    { code: "SVT", label: "علوم الحياة والأرض" }, { code: "PHYS", label: "العلوم الفيزيائية" },
    { code: "M", label: "الرياضيات" }, { code: "F", label: "الفرنسية" },
    { code: "ANG", label: "الإنجليزية" }, { code: "PHILO", label: "الفلسفة" },
    { code: "AR", label: "العربية" }, { code: "INF", label: "الإعلامية" },
    { code: "SPT", label: "الرياضة" }, ...OPTIONAL_SUBJECTS,
  ],
  "إقتصاد وتصرف": [
    { code: "ECO", label: "الإقتصاد" }, { code: "GEST", label: "التصرف" },
    { code: "M", label: "الرياضيات" }, { code: "HG", label: "التاريخ والجغرافيا" },
    { code: "F", label: "الفرنسية" }, { code: "ANG", label: "الإنجليزية" },
    { code: "PHILO", label: "الفلسفة" }, { code: "AR", label: "العربية" },
    { code: "INF", label: "الإعلامية" }, { code: "SPT", label: "الرياضة" },
    ...OPTIONAL_SUBJECTS,
  ],
  "العلوم التقنية": [
    { code: "TECH", label: "التكنولوجيا" }, { code: "M", label: "الرياضيات" },
    { code: "PHYS", label: "العلوم الفيزيائية" }, { code: "F", label: "الفرنسية" },
    { code: "ANG", label: "الإنجليزية" }, { code: "PHILO", label: "الفلسفة" },
    { code: "AR", label: "العربية" }, { code: "INF", label: "الإعلامية" },
    { code: "SPT", label: "الرياضة" }, ...OPTIONAL_SUBJECTS,
  ],
  "علوم الإعلامية": [
    { code: "ALGO", label: "الخوارزميات والبرمجة" }, { code: "STI", label: "أنظمة المعلومات" },
    { code: "M", label: "الرياضيات" }, { code: "PHYS", label: "العلوم الفيزيائية" },
    { code: "F", label: "الفرنسية" }, { code: "ANG", label: "الإنجليزية" },
    { code: "PHILO", label: "الفلسفة" }, { code: "AR", label: "العربية" },
    { code: "SPT", label: "الرياضة" }, ...OPTIONAL_SUBJECTS,
  ],
  "رياضة": [
    { code: "SVT", label: "علوم الحياة والأرض" }, { code: "SP_PRAT", label: "الرياضة التطبيقية" },
    { code: "EP", label: "التربية البدنية" }, { code: "PHYS", label: "العلوم الفيزيائية" },
    { code: "PHILO", label: "الفلسفة" }, { code: "M", label: "الرياضيات" },
    { code: "F", label: "الفرنسية" }, { code: "ANG", label: "الإنجليزية" },
    { code: "AR", label: "العربية" }, { code: "SPT", label: "الرياضة" },
    ...OPTIONAL_SUBJECTS,
  ],
};

export function getBacSubjects(bacType: string): BacSubject[] {
  return BAC_SUBJECTS[bacType] ?? [];
}
