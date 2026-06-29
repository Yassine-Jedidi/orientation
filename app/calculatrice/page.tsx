"use client";

import { useEffect, useState, useMemo, Fragment } from "react";
import Link from "next/link";
import type { ScoreRecord } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AuthNav } from "@/components/auth/auth-nav";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipArrow,
  TooltipPopup,
  TooltipPortal,
  TooltipPositioner,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BAC_ORDER } from "@/lib/bac-order";
import { getBacFormula, ABBREVIATIONS } from "@/lib/bac-formulas";

const FG_SUBJECTS: Record<string, { code: string; label: string }[]> = {
  "آداب": [
    { code: "AR", label: "العربية" },
    { code: "PHILO", label: "الفلسفة" },
    { code: "HG", label: "التاريخ والجغرافيا" },
    { code: "F", label: "الفرنسية" },
    { code: "ANG", label: "الإنجليزية" },
  ],
  "رياضيات": [
    { code: "M", label: "الرياضيات" },
    { code: "PHYS", label: "الفيزياء" },
    { code: "SVT", label: "علوم الحياة والأرض" },
    { code: "F", label: "الفرنسية" },
    { code: "ANG", label: "الإنجليزية" },
  ],
  "علوم تجريبية": [
    { code: "M", label: "الرياضيات" },
    { code: "PHYS", label: "الفيزياء" },
    { code: "SVT", label: "علوم الحياة والأرض" },
    { code: "F", label: "الفرنسية" },
    { code: "ANG", label: "الإنجليزية" },
  ],
  "إقتصاد وتصرف": [
    { code: "ECO", label: "الاقتصاد" },
    { code: "GEST", label: "التصرف" },
    { code: "M", label: "الرياضيات" },
    { code: "HG", label: "التاريخ والجغرافيا" },
    { code: "F", label: "الفرنسية" },
    { code: "ANG", label: "الإنجليزية" },
  ],
  "العلوم التقنية": [
    { code: "TECH", label: "التكنولوجيا" },
    { code: "M", label: "الرياضيات" },
    { code: "PHYS", label: "الفيزياء" },
    { code: "F", label: "الفرنسية" },
    { code: "ANG", label: "الإنجليزية" },
  ],
  "علوم الإعلامية": [
    { code: "M", label: "الرياضيات" },
    { code: "ALGO", label: "خوارزميات" },
    { code: "PHYS", label: "الفيزياء" },
    { code: "STI", label: "نظم المعلومات" },
    { code: "F", label: "الفرنسية" },
    { code: "ANG", label: "الإنجليزية" },
  ],
  "رياضة": [
    { code: "SVT", label: "علوم الحياة والأرض" },
    { code: "SP_PRAT", label: "التربية الرياضية (تطبيق)" },
    { code: "EP", label: "التربية البدنية" },
    { code: "PHYS", label: "الفيزياء" },
    { code: "PHILO", label: "الفلسفة" },
    { code: "F", label: "الفرنسية" },
    { code: "ANG", label: "الإنجليزية" },
  ],
};

function getSubjectsForBac(bacType: string) {
  return FG_SUBJECTS[bacType] ?? [];
}

export default function CalculatorPage() {
  const [data, setData] = useState<ScoreRecord[]>([]);
  const [bacType, setBacType] = useState("");
  const [mgInput, setMgInput] = useState("");
  const [grades, setGrades] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/data/scores.json")
      .then((r) => r.json())
      .then(setData);
  }, []);

  const bacTypes = useMemo(
    () =>
      [...new Set(data.map((r) => r.bacType))].sort(
        (a, b) => BAC_ORDER.indexOf(a) - BAC_ORDER.indexOf(b)
      ),
    [data]
  );

  const subjects = useMemo(() => getSubjectsForBac(bacType), [bacType]);
  const formula = useMemo(() => getBacFormula(bacType), [bacType]);

  function normalize(v: string): string {
    return v.replace(",", ".");
  }

  function isValidGrade(v: string): boolean {
    if (v === "") return true;
    const n = parseFloat(normalize(v));
    return !isNaN(n) && n >= 0 && n <= 20;
  }

  function isValidMg(v: string): boolean {
    if (v === "") return true;
    const n = parseFloat(normalize(v));
    return !isNaN(n) && n >= 0 && n <= 20;
  }

  const mgError = useMemo(() => {
    if (mgInput === "") return false;
    return !isValidMg(mgInput);
  }, [mgInput]);

  const errors = useMemo(() => {
    const e: Record<string, boolean> = {};
    for (const [code, v] of Object.entries(grades)) {
      if (v !== "" && !isValidGrade(v)) {
        e[code] = true;
      }
    }
    return e;
  }, [grades]);

  const hasErrors = mgError || Object.keys(errors).length > 0;

  const result = useMemo(() => {
    if (hasErrors) return null;
    const mg = parseFloat(mgInput);
    if (isNaN(mg) || mg < 0 || mg > 20) return null;
    if (!formula) return null;
    let fgBonus = 0;
    let filledCount = 0;
    for (const t of formula.terms) {
      const v = parseFloat(grades[t.code] ?? "");
      if (!isNaN(v) && v >= 0 && v <= 20) {
        fgBonus += v * t.coeff;
        filledCount++;
      }
    }
    if (filledCount === 0) return null;
    const fg = 4 * mg + fgBonus;
    const fgRegional = fg * 1.07;
    return { mg, fg, fgRegional };
  }, [mgInput, grades, hasErrors, formula]);

  function setGrade(code: string, value: string) {
    if (value.includes("-")) return;
    setGrades((prev) => ({ ...prev, [code]: normalize(value) }));
  }

  return (
    <div className="flex flex-col flex-1">
      <header className="border-b border-border bg-canvas">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-display-sm font-heading font-medium text-ink">
                حاسبة النقاط
              </h1>
              <p className="mt-2 text-body">
                احسب معدلك التوجيهي (FG) حسب مواد شعبتك
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
                دليل التوجيه
              </Button>
              <AuthNav />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-6">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>شعبة الباكالوريا</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={bacType}
              onValueChange={(v) => {
                setBacType(v ?? "");
                setGrades({});
                setMgInput("");
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="اختر شعبتك" />
              </SelectTrigger>
              <SelectContent>
                {bacTypes.map((bt) => (
                  <SelectItem key={bt} value={bt}>
                    {bt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {bacType && (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>صيغة الاحتساب</CardTitle>
              </CardHeader>
              <CardContent>
                {formula && (
                  <TooltipProvider>
                    <div className="rounded-lg bg-surface-soft px-4 py-4 text-center text-sm text-body">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap" dir="ltr" style={{ unicodeBidi: "embed" }}>
                        <Tooltip>
                          <TooltipTrigger className="font-semibold border-b border-dotted border-muted-soft cursor-help">
                            FG
                          </TooltipTrigger>
                          <TooltipPortal>
                            <TooltipPositioner>
                              <TooltipPopup>{ABBREVIATIONS.FG}</TooltipPopup>
                              <TooltipArrow />
                            </TooltipPositioner>
                          </TooltipPortal>
                        </Tooltip>
                        <span>=</span>
                        <span>4×<Tooltip>
                            <TooltipTrigger className="font-semibold border-b border-dotted border-muted-soft cursor-help">
                              MG
                            </TooltipTrigger>
                            <TooltipPortal>
                              <TooltipPositioner>
                                <TooltipPopup>{ABBREVIATIONS.MG}</TooltipPopup>
                                <TooltipArrow />
                              </TooltipPositioner>
                            </TooltipPortal>
                          </Tooltip></span>
                        {formula.terms.map((t) => (
                          <Fragment key={t.code}>
                            <span>+</span>
                            <span>{t.coeff === 1 ? "" : t.coeff + " "}<Tooltip>
                                <TooltipTrigger className="font-semibold border-b border-dotted border-muted-soft cursor-help">
                                  {t.label}
                                </TooltipTrigger>
                                <TooltipPortal>
                                  <TooltipPositioner>
                                    <TooltipPopup>{ABBREVIATIONS[t.label] ?? t.label}</TooltipPopup>
                                    <TooltipArrow />
                                  </TooltipPositioner>
                                </TooltipPortal>
                              </Tooltip></span>
                          </Fragment>
                        ))}
                      </div>
                    </div>
                  </TooltipProvider>
                )}
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>المواد</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="flex-1 text-sm text-body">
                      المعدل العام
                    </label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0-20"
                      value={mgInput}
                      onChange={(e) => setMgInput(normalize(e.target.value))}
                      className="w-24 text-center"
                      aria-invalid={mgError ? true : undefined}
                    />
                  </div>
                  {mgError && (
                    <div className="text-xs text-destructive">
                      القيمة يجب أن تكون بين 0 و 20
                    </div>
                  )}

                  <div className="border-t border-border pt-3">
                    {subjects.map((s) => (
                      <div
                        key={s.code}
                        className="flex items-center gap-3 py-1.5"
                      >
                        <label className="flex-1 text-sm text-body">
                          {s.label}
                        </label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0-20"
                          value={grades[s.code] ?? ""}
                          onChange={(e) => setGrade(s.code, e.target.value)}
                          className="w-24 text-center"
                          aria-invalid={errors[s.code] ? true : undefined}
                        />
                      </div>
                    ))}

                  </div>
                </div>
                {Object.keys(errors).length > 0 && (
                  <div className="mt-3 text-xs text-destructive">
                    القيم يجب أن تكون بين 0 و 20
                  </div>
                )}
              </CardContent>
            </Card>

            {result && (
              <Card>
                <CardHeader>
                  <CardTitle>النتيجة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg bg-surface-soft px-4 py-3">
                      <span className="text-sm text-body">الصيغة الاجمالية (FG)</span>
                      <span className="text-lg font-semibold tabular-nums text-ink">
                        {result.fg.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-surface-soft px-4 py-3">
                      <span className="text-sm text-body">FG + 7% (ولايات التنفيل)</span>
                      <span className="text-lg font-semibold tabular-nums text-ink">
                        {result.fgRegional.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-border bg-surface-soft">
        <div className="mx-auto max-w-7xl px-6 py-6 text-center text-sm text-body">
          البيانات مأخوذة من دليل التوجيه الجامعي التونسي 2025-2026
        </div>
      </footer>
    </div>
  );
}
