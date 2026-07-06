const BAC_TYPE_CODES: Record<string, number> = {
  "آداب": 0,
  "رياضيات": 1,
  "علوم تجريبية": 2,
  "إقتصاد وتصرف": 3,
  "علوم الإعلامية": 4,
  "العلوم التقنية": 5,
  "رياضة": 6,
};

const CODE_TO_BAC_TYPE: Record<number, string> = {};
for (const [k, v] of Object.entries(BAC_TYPE_CODES)) {
  CODE_TO_BAC_TYPE[v] = k;
}

export function encodeShareData(bacType: string, codes: string[]): string {
  const buf = new ArrayBuffer(1 + codes.length * 2);
  const dv = new DataView(buf);
  dv.setUint8(0, BAC_TYPE_CODES[bacType] ?? 0);
  codes.forEach((code, i) => dv.setUint16(1 + i * 2, Number(code)));
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeShareData(id: string): { bacType: string; codes: string[] } | null {
  try {
    const base64 = id.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64);
    const buf = new ArrayBuffer(binary.length);
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const dv = new DataView(buf);
    const bacTypeIndex = dv.getUint8(0);
    const bacType = CODE_TO_BAC_TYPE[bacTypeIndex];
    if (!bacType) return null;
    const codes: string[] = [];
    for (let i = 1; i + 1 < binary.length; i += 2) {
      codes.push(String(dv.getUint16(i)));
    }
    return codes.length > 0 ? { bacType, codes } : null;
  } catch {
    return null;
  }
}
