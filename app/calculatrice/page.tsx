"use client";

import { useEffect, useState, useMemo, Fragment, useRef } from "react";
import Link from "next/link";
import { Check, Save, Menu } from "lucide-react";
import type { ScoreRecord } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AuthNav } from "@/components/auth/auth-nav";
import Avatar, { genConfig } from "react-nice-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
import { authClient } from "@/lib/auth-client";
import { calculateFg } from "@/lib/fg";
import { getBacOptionalSubjects, getBacSubjects } from "@/lib/bac-subjects";

function normalize(v: string): string {
  return (v ?? "").replace(",", ".");
}

function isTwoDecimalInput(v: string): boolean {
  return /^\d{0,2}(?:\.\d{0,2})?$/.test(normalize(v));
}

function isValidGrade(v: string): boolean {
  if (!v && v !== "0") return true;
  const n = parseFloat(normalize(v));
  return !isNaN(n) && n >= 0 && n <= 20;
}

function isValidMg(v: string): boolean {
  if (!v && v !== "0") return true;
  const n = parseFloat(normalize(v));
  return !isNaN(n) && n >= 0 && n <= 20;
}

export default function CalculatorPage() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [data, setData] = useState<ScoreRecord[]>([]);
  const [bacType, setBacType] = useState("");
  const [mgInput, setMgInput] = useState("");
  const [grades, setGrades] = useState<Record<string, string>>({});
  const [optionalSubject, setOptionalSubject] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const loadedSavedScore = useRef(false);
  const formCache = useRef<Record<string, { mg: string; grades: Record<string, string>; optionalSubject: string; saved: boolean }>>({});

  useEffect(() => {
    fetch("/data/scores.json")
      .then((r) => r.json())
      .then(setData);
  }, []);

  useEffect(() => {
    if (!session || loadedSavedScore.current) return;
    loadedSavedScore.current = true;

    fetch("/api/student-score")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!payload?.bacType) return;
        setBacType(payload.bacType);
        if (!payload.score) return;
        const mg = Number(payload.score.generalAverage).toFixed(2);
        const loadedGrades = Object.fromEntries(
          Object.entries(payload.score.grades as Record<string, number>).map(
            ([code, grade]) => [code, Number(grade).toFixed(2)],
          ),
        );
        const loadedOptionalSubject = getBacOptionalSubjects(payload.bacType).find(
          ({ code }) => loadedGrades[code] !== undefined,
        )?.code ?? "";
        setMgInput(mg);
        setGrades(loadedGrades);
        setOptionalSubject(loadedOptionalSubject);
        formCache.current[payload.bacType] = { mg, grades: loadedGrades, optionalSubject: loadedOptionalSubject, saved: true };
      });
  }, [session]);

  const bacTypes = useMemo(
    () =>
      [...new Set(data.map((r) => r.bacType))].sort(
        (a, b) => BAC_ORDER.indexOf(a) - BAC_ORDER.indexOf(b)
      ),
    [data]
  );

  const subjects = useMemo(() => getBacSubjects(bacType), [bacType]);
  const optionalSubjects = useMemo(() => getBacOptionalSubjects(bacType), [bacType]);
  const formula = useMemo(() => getBacFormula(bacType), [bacType]);

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

  const numericGrades = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(grades)
          .filter(([, value]) => value !== "")
          .map(([code, value]) => [code, parseFloat(value)]),
      ),
    [grades],
  );

  const result = useMemo(() => {
    if (hasErrors) return null;
    const mg = parseFloat(mgInput);
    const calculated = calculateFg({
      bacType,
      generalAverage: mg,
      grades: numericGrades,
    });
    return calculated ? { mg, ...calculated } : null;
  }, [mgInput, numericGrades, hasErrors, bacType]);

  function setGrade(code: string, value: string) {
    const normalized = normalize(value);
    if (!isTwoDecimalInput(normalized)) return;
    setGrades((prev) => ({ ...prev, [code]: normalized }));
    setSaveState("idle");
  }

  function selectOptionalSubject(code: string) {
    setGrades((previous) => {
      const legacyGrade = previous.OPT;
      const currentGrade = optionalSubjects.map((subject) => previous[subject.code]).find(
        (grade) => grade !== undefined,
      );
      const next = { ...previous };
      delete next.OPT;
      for (const subject of optionalSubjects) delete next[subject.code];
      const grade = currentGrade ?? legacyGrade;
      if (grade !== undefined) next[code] = grade;
      return next;
    });
    setOptionalSubject(code);
    setSaveState("idle");
  }

  async function saveScore() {
    if (!result) return;
    setSaveState("saving");
    const response = await fetch("/api/student-score", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bacType,
        generalAverage: result.mg,
        grades: numericGrades,
      }),
    });
    if (response.ok) {
      formCache.current[bacType] = { mg: mgInput, grades, optionalSubject, saved: true };
    }
    setSaveState(response.ok ? "saved" : "error");
  }

  function selectBacType(value: string) {
    if (bacType) {
      formCache.current[bacType] = { mg: mgInput, grades, optionalSubject, saved: saveState === "saved" };
    }

    setBacType(value);
    setGrades({});
    setOptionalSubject("");
    setMgInput("");
    setSaveState("idle");

    const cached = formCache.current[value];
    if (cached) {
      setMgInput(cached.mg);
      setGrades(cached.grades);
      setOptionalSubject(cached.optionalSubject);
      setSaveState(cached.saved ? "saved" : "idle");
    }

    if (!session) return;
    void fetch("/api/student-score", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bacType: value }),
    });
  }

  return (
    <div className="flex flex-col flex-1">
      <header className="border-b border-border bg-canvas">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-display-sm font-heading font-medium text-ink">
                احسب سكورك
              </h1>
              <p className="mt-2 text-body">
                احسب معدلك التوجيهي (FG) حسب مواد شعبتك
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Desktop */}
              <div className="hidden items-center gap-3 sm:flex">
                {session?.user?.name && (
                  <span className="flex items-center gap-2">
                    <Avatar
                      className="size-10 shrink-0"
                      {...genConfig(session.user.email ?? session.user.name)}
                    />
                    <span className="text-sm text-body">{session.user.name}</span>
                  </span>
                )}
                <Button nativeButton={false} render={<Link href="/" />}>
                  دليل التوجيه
                </Button>
                <AuthNav />
              </div>

              {/* Mobile */}
              <div className="sm:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
                    <Menu className="size-5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" sideOffset={8} className="w-48">
                    {session?.user?.name && (
                      <>
                        <DropdownMenuGroup>
                          <DropdownMenuLabel className="flex items-center gap-2 font-normal">
                            <Avatar
                              className="size-10 shrink-0"
                              {...genConfig(session.user.email ?? session.user.name)}
                            />
                            <span>{session.user.name}</span>
                          </DropdownMenuLabel>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem>
                      <Link href="/" className="flex w-full items-center gap-2">
                        دليل التوجيه
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <div className="px-1 py-1">
                      <AuthNav />
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
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
                if (v) selectBacType(v);
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
                      onChange={(e) => {
                        const value = normalize(e.target.value);
                        if (!isTwoDecimalInput(value)) return;
                        setMgInput(value);
                        setSaveState("idle");
                      }}
                      onBlur={() => {
                        if (mgInput !== "" && isValidMg(mgInput)) {
                          setMgInput(Number(mgInput).toFixed(2));
                        }
                      }}
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
                    {subjects.map((s) => s.optional ? (
                      <div key={s.code} className="space-y-2 py-1.5">
                        <div className="flex items-center gap-3">
                          <label className="flex-1 text-sm text-body">{s.label}</label>
                          <Select
                            value={optionalSubject || null}
                            onValueChange={(value) => value && selectOptionalSubject(value)}
                          >
                            <SelectTrigger className="w-40" aria-label="اختر المادة الاختيارية">
                              <SelectValue>
                                {optionalSubjects.find(({ code }) => code === optionalSubject)?.label
                                  ?? "اختر المادة"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {optionalSubjects.map((subject) => (
                                <SelectItem key={subject.code} value={subject.code}>
                                  {subject.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0-20"
                            disabled={!optionalSubject}
                            value={optionalSubject ? grades[optionalSubject] ?? "" : grades.OPT ?? ""}
                            onChange={(e) => optionalSubject && setGrade(optionalSubject, e.target.value)}
                            onBlur={() => {
                              if (!optionalSubject) return;
                              const value = grades[optionalSubject];
                              if (value !== undefined && value !== "" && isValidGrade(value)) {
                                setGrades((previous) => ({
                                  ...previous,
                                  [optionalSubject]: Number(value).toFixed(2),
                                }));
                              }
                            }}
                            className="w-24 text-center"
                            aria-invalid={optionalSubject && errors[optionalSubject] ? true : undefined}
                          />
                        </div>
                        {grades.OPT !== undefined && !optionalSubject && (
                          <p className="text-xs text-body">اختر المادة لربط النقطة المحفوظة بها.</p>
                        )}
                      </div>
                    ) : (
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
                          onBlur={() => {
                            const value = grades[s.code];
                            if (value !== undefined && value !== "" && isValidGrade(value)) {
                              setGrades((previous) => ({
                                ...previous,
                                [s.code]: Number(value).toFixed(2),
                              }));
                            }
                          }}
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
              <Card className="border-transparent bg-brand-ochre/35 ring-brand-ochre/70">
                <CardHeader>
                  <CardTitle>النتيجة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg bg-surface-soft px-4 py-3">
                      <span className="text-sm text-body">الصيغة الاجمالية (FG)</span>
                      <span className="text-lg font-semibold tabular-nums text-ink">
                        {result.fg.toFixed(4)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-surface-soft px-4 py-3">
                      <span className="text-sm text-body">FG + 7% (ولايات التنفيل)</span>
                      <span className="text-lg font-semibold tabular-nums text-ink">
                        {result.fgRegional.toFixed(4)}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-body">
                      قيمة التنفيل تقديرية وتُعتمد فقط للولايات والحالات المشمولة بنسبة 7%.
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="justify-between gap-3 bg-canvas/70">
                  {sessionPending ? (
                    <div className="h-11 w-full animate-pulse rounded-md bg-surface-strong" />
                  ) : session ? (
                    <>
                      <div className="text-sm text-body" aria-live="polite">
                        {saveState === "saved" && (
                          <span className="inline-flex items-center gap-2 text-body-strong">
                            <Check className="size-4 text-success" /> تم حفظ نتيجتك
                          </span>
                        )}
                        {saveState === "error" && (
                          <span className="text-destructive">تعذّر الحفظ، حاول مجدداً</span>
                        )}
                      </div>
                      <Button
                        onClick={saveScore}
                        disabled={saveState === "saving"}
                        className={
                          saveState === "saved" || saveState === "error"
                            ? "mr-auto"
                            : undefined
                        }
                      >
                        <Save />
                        {saveState === "saving"
                          ? "جارٍ الحفظ..."
                          : saveState === "saved"
                            ? "تحديث النتيجة"
                            : "حفظ النتيجة"}
                      </Button>
                    </>
                  ) : (
                    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-body">سجّل الدخول للاحتفاظ بنتيجتك والعودة إليها لاحقاً.</p>
                      <Button nativeButton={false} render={<Link href="/connexion" />}>
                        تسجيل الدخول للحفظ
                      </Button>
                    </div>
                  )}
                </CardFooter>
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
