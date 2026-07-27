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
const MIXED_BAC_MARKER = 255;
for (const [k, v] of Object.entries(BAC_TYPE_CODES)) {
  CODE_TO_BAC_TYPE[v] = k;
}

function encodeBytes(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function encodeShareData(
  bacTypeOrEntries: string | { bacType: string; code: string }[],
  codes?: string[],
): string {
  if (Array.isArray(bacTypeOrEntries)) {
    const entries = bacTypeOrEntries;
    const buf = new ArrayBuffer(1 + entries.length * 3);
    const dv = new DataView(buf);
    dv.setUint8(0, MIXED_BAC_MARKER);
    entries.forEach((entry, i) => {
      const offset = 1 + i * 3;
      dv.setUint8(offset, BAC_TYPE_CODES[entry.bacType] ?? 0);
      dv.setUint16(offset + 1, Number(entry.code));
    });
    return encodeBytes(new Uint8Array(buf));
  }

  const bacType = bacTypeOrEntries;
  const codeList = codes ?? [];
  const buf = new ArrayBuffer(1 + codeList.length * 2);
  const dv = new DataView(buf);
  dv.setUint8(0, BAC_TYPE_CODES[bacType] ?? 0);
  codeList.forEach((code, i) => dv.setUint16(1 + i * 2, Number(code)));
  return encodeBytes(new Uint8Array(buf));
}

export interface ShareUserData {
  s?: number;
  g?: string;
  d?: Record<string, number>;
  n?: "male" | "female";
}

export function encodeUserData(data: ShareUserData): string {
  const json = JSON.stringify(data);
  let binary = "";
  for (let i = 0; i < json.length; i++) binary += String.fromCharCode(json.charCodeAt(i));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeUserData(encoded: string): ShareUserData | null {
  try {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    return JSON.parse(json) as ShareUserData;
  } catch {
    return null;
  }
}

export function decodeShareData(id: string): { bacType: string; codes: string[]; entries?: { bacType: string; code: string }[] } | null {
  try {
    const base64 = id.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64);
    const buf = new ArrayBuffer(binary.length);
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const dv = new DataView(buf);
    const bacTypeIndex = dv.getUint8(0);
    if (bacTypeIndex === MIXED_BAC_MARKER) {
      const entries: { bacType: string; code: string }[] = [];
      for (let i = 1; i + 2 < binary.length; i += 3) {
        const entryBacType = CODE_TO_BAC_TYPE[dv.getUint8(i)];
        if (!entryBacType) return null;
        entries.push({ bacType: entryBacType, code: String(dv.getUint16(i + 1)) });
      }
      return entries.length > 0
        ? { bacType: entries[0].bacType, codes: entries.map((entry) => entry.code), entries }
        : null;
    }
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
