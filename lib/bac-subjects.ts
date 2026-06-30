export interface BacSubject {
  code: string;
  label: string;
  optional?: boolean;
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
