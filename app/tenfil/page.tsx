import fs from "node:fs";
import path from "node:path";

import { GeographicBonusDirectory } from "./geographic-bonus-directory";

export interface GeographicBonusLicense {
  code: string;
  name: string;
}

function readLicenseLists() {
  const source = fs.readFileSync(
    path.join(process.cwd(), "docs", "geographic-bonus-licenses.md"),
    "utf8",
  );
  const sections = source.split(/^## /m);

  const parse = (heading: string) => {
    const section = sections.find((part) => part.startsWith(heading)) ?? "";
    return [...section.matchAll(/^\| (\d{3}) \| (.+) \|$/gm)].map(
      ([, code, name]) => ({ code, name }),
    );
  };

  return {
    eligible: parse("الشعب التي يتمتع"),
    excluded: parse("الشعب التي لا يتمتع"),
  };
}

export default function GeographicBonusPage() {
  const lists = readLicenseLists();

  return (
    <div className="min-h-screen bg-canvas">


      <main>
        <section className="border-b border-border bg-surface-soft">
          <div className="mx-auto grid max-w-7xl gap-8 px-6 py-14 lg:grid-cols-[1.4fr_0.6fr] lg:items-start lg:py-20">
            <div>
              <span className="inline-flex rounded-full bg-brand-ochre px-3 py-1 text-caption font-semibold text-ink">
                التنفيل الجغرافي · 7%
              </span>
              <h1 className="mt-5 max-w-3xl text-display-sm font-heading font-medium tracking-tight text-ink md:text-display-md">
                اعرف الشعب المشمولة بالتنفيل قبل ترتيب اختياراتك
              </h1>
              <p className="mt-5 max-w-2xl text-body-md leading-8 text-body">
                يُسند تنفيل قدره 7% من مجموع النقاط عند طلب اختصاص مشمول
                وموجود في ولايتك. وتُعامل ولايات تونس الكبرى كفضاء جغرافي واحد.
              </p>
            </div>
            <div className="rounded-xl bg-brand-teal p-6 text-white md:p-8">
              <p className="text-sm text-white/70">طريقة الحساب</p>
              <p className="mt-3 text-sm leading-6 text-white/90">
                <bdi dir="ltr" className="font-semibold">T</bdi> هو مجموع نقاطك
                المحتسب حسب صيغة الشعبة المطلوبة، قبل إضافة التنفيل.
              </p>
              <p className="mt-3 text-display-sm font-heading font-medium" dir="ltr">
                T × 1.07
              </p>
              <p className="mt-3 text-sm leading-6 text-white/80">
                إذا لم يوجد الاختصاص في ولايتك، يُحتسب التنفيل عند طلبه في أقرب
                مؤسسة تعليم عال إلى مركز ولايتك.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-10 md:py-14">
          <div className="mb-12 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-brand-mint p-6">
              <p className="text-sm font-semibold text-ink">1. الاختصاص مشمول بالتنفيل</p>
              <p className="mt-2 text-sm leading-6 text-body">
                يجب أن يكون رمز الشعبة الوطنية ضمن قائمة الشعب التي يتمتع من يطلبها بالتنفيل الجغرافي.
              </p>
            </div>
            <div className="rounded-xl bg-brand-lavender p-6">
              <p className="text-sm font-semibold text-ink">2. الاختصاص في ولايتك أو الأقرب إليها</p>
              <p className="mt-2 text-sm leading-6 text-body">
                إذا لم يوجد الاختصاص في ولايتك، تنتفع بالتنفيل عند طلبه في أقرب مؤسسة تعليم عال إلى مركز ولايتك.
              </p>
            </div>
            <div className="rounded-xl bg-brand-peach p-6">
              <p className="text-sm font-semibold text-ink">3. الاستثناءات لا تنتفع</p>
              <p className="mt-2 text-sm leading-6 text-body">
                لا يشمل التنفيل الطب، والمراحل التحضيرية للدراسات الهندسية، وإجازات التربية والتعليم، والاختصاصات التي تُدرّس في مؤسسة جامعية واحدة بكامل تراب الجمهورية أو في عدة مؤسسات متركزة في الجهة نفسها.
              </p>
            </div>
          </div>

          <div className="mb-8 rounded-xl bg-brand-ochre/35 p-6 ring-1 ring-brand-ochre/70">
            <p className="text-sm font-semibold text-ink">خصوصية تونس الكبرى</p>
            <p className="mt-2 text-sm leading-7 text-body">
              ولايات تونس وأريانة وبن عروس ومنوبة تُعتبر فضاءً جغرافيًا واحدًا
              في احتساب التنفيل. لذلك يمكن للمترشح من إحدى هذه الولايات أن
              ينتفع بالتنفيل في مؤسسة موجودة في أي ولاية أخرى منها، إذا كانت
              الشعبة مشمولة بالتنفيل.
            </p>
          </div>

          <p className="mb-6 text-sm leading-7 text-muted-text">
            دليل التوجيه الجامعي 2026، الصفحة 18: لتحديد الولاية، يُعتمد المعهد
            الأصلي أو مركز الامتحان، وعند غياب الاختصاص يُعتمد أقرب مؤسسة إلى
            مركز الولاية. ملاحظة تونس الكبرى مذكورة صراحة في أدلة التوجيه
            السابقة، ولا تتكرر حرفيًا في نسخة دليل 2026 المتوفرة لدينا.
          </p>

          <GeographicBonusDirectory {...lists} />
        </section>
      </main>
    </div>
  );
}
