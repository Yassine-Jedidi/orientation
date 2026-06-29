export const BAC_SUBJECTS: Record<string, string[]> = {
  "رياضيات": ["AR", "ANG", "F", "M", "PH", "SP", "SVT", "HG", "INF", "ESP", "ALL"],
  "علوم تجريبية": ["AR", "ANG", "F", "M", "PH", "SP", "SVT", "HG", "INF", "ESP", "ALL"],
  "علوم الإعلامية": ["AR", "ANG", "F", "M", "PH", "SP", "Algo", "HG", "INF", "STI", "ESP", "ALL"],
  "العلوم التقنية": ["AR", "ANG", "F", "M", "PH", "SP", "SVT", "TE", "HG", "INF", "ESP", "ALL"],
  "إقتصاد وتصرف": ["AR", "ANG", "F", "M", "PH", "ECO", "GEST", "HG", "INF", "ESP", "ALL"],
  "آداب": ["AR", "ANG", "F", "PH", "HG", "INF", "ESP", "SVT", "ALL", "Spt"],
  "رياضة": ["AR", "ANG", "F", "PH", "HG", "SP", "SB", "Spt"],
};

export function getBacSubjects(bacType: string): string[] {
  return BAC_SUBJECTS[bacType] ?? [];
}
