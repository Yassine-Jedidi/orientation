import fs from "node:fs";
import path from "node:path";

import { RemovedLicensesDirectory } from "./removed-licenses-directory";

export interface RemovedLicense {
  code: string;
  license: string;
  institution: string;
  university: string;
  fullyRemoved: boolean;
}

function readRemovedLicenses(): RemovedLicense[] {
  const oldRows = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "public", "data", "scores.json"), "utf8"),
  ) as Omit<RemovedLicense, "fullyRemoved">[];
  const newRows = JSON.parse(
    fs.readFileSync(
      path.join(process.cwd(), "extract", "guide2026_formula_by_license_bactype.json"),
      "utf8",
    ),
  ) as { code: string; license: string }[];

  const newCodes = new Set(newRows.map((row) => row.code));
  const newNames = new Set(newRows.map((row) => row.license));
  const unique2025 = new Map(oldRows.map((row) => [row.code, row]));

  return [...unique2025.values()]
    .filter((row) => !newCodes.has(row.code))
    .map((row) => ({ ...row, fullyRemoved: !newNames.has(row.license) }))
    .sort((a, b) => a.code.localeCompare(b.code));
}

export default function RemovedLicensesPage() {
  const licenses = readRemovedLicenses();
  const institutions = new Set(licenses.map((license) => license.institution)).size;

  return (
    <div className="min-h-screen bg-canvas">
      <main>
        <section className="border-b border-border bg-surface-soft">
          <div className="mx-auto grid max-w-7xl gap-8 px-6 py-14 lg:grid-cols-[1.35fr_0.65fr] lg:items-end lg:py-20">
            <div>
              <span className="inline-flex rounded-full bg-brand-coral px-3 py-1 text-caption font-semibold text-ink">
                مقارنة دليلَي 2025 و2026
              </span>
              <h1 className="mt-5 max-w-4xl text-display-sm font-heading font-medium tracking-tight text-ink md:text-display-md">
                الشعب التي لم تعد مدرجة في دليل التوجيه 2026
              </h1>
              <p className="mt-5 max-w-3xl text-body-md leading-8 text-body">
                قائمة بجميع رموز التوجيه الموجودة في دليل 2025 والغائبة عن دليل 2026، مع اسم الشعبة والمؤسسة والجامعة لكل عرض.
              </p>
            </div>
            <div className="rounded-xl bg-brand-teal p-6 text-white md:p-8">
              <p className="text-sm font-semibold text-white/75">مهم قبل القراءة</p>
              <p className="mt-3 text-sm leading-7 text-white/90">
                غياب الرمز لا يعني دائمًا إلغاء الاختصاص نهائيًا؛ قد يبقى الاسم متاحًا في مؤسسة أخرى، أو يتغير الاسم أو الرمز في الدليل الجديد.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-10 md:py-14">
          <div className="mb-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-brand-peach p-6">
              <p className="text-display-sm font-heading font-medium tabular-nums">{licenses.length}</p>
              <p className="mt-2 text-sm font-semibold">رمز توجيه غائب</p>
            </div>
            <div className="rounded-xl bg-brand-mint p-6">
              <p className="text-display-sm font-heading font-medium tabular-nums">{institutions}</p>
              <p className="mt-2 text-sm font-semibold">مؤسسة معنية</p>
            </div>
          </div>

          <RemovedLicensesDirectory licenses={licenses} />

          <p className="mt-6 text-sm leading-7 text-muted-text">
            المصدر: مقارنة رموز الشعب الواردة في دليل التوجيه الجامعي 2025 مع دليل 2026. الحالة مبنية على وجود الرمز واسم الشعبة في النسخة الجديدة، ولا تمثل إعلانًا رسميًا بالإلغاء.
          </p>
        </section>
      </main>
    </div>
  );
}
