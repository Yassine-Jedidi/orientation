export const BAC_TYPE_CODES = {
  "آداب": "literature",
  "رياضيات": "mathematics",
  "علوم تجريبية": "experimental_sciences",
  "إقتصاد وتصرف": "economics_and_management",
  "العلوم التقنية": "technical_sciences",
  "علوم الإعلامية": "computer_science",
  "رياضة": "sport",
} as const;

export type BacTypeLabel = keyof typeof BAC_TYPE_CODES;
export type BacTypeCode = (typeof BAC_TYPE_CODES)[BacTypeLabel];

const BAC_TYPE_LABELS = Object.fromEntries(
  Object.entries(BAC_TYPE_CODES).map(([label, code]) => [code, label]),
) as Record<BacTypeCode, BacTypeLabel>;

export function getBacTypeCode(label: string): BacTypeCode | null {
  return BAC_TYPE_CODES[label as BacTypeLabel] ?? null;
}

export function getBacTypeLabel(value: string): BacTypeLabel | null {
  if (value in BAC_TYPE_CODES) return value as BacTypeLabel;
  return BAC_TYPE_LABELS[value as BacTypeCode] ?? null;
}
