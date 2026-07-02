"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Search,
  Check,
  ArrowUp,
  X,
  CircleSlash2,
  ChevronLeft,
  Calculator,
} from "lucide-react";
import type { ScoreRecord } from "@/lib/types";
import { TUNISIA_GOVERNORATES } from "@/lib/governorates";
import { BAC_ORDER } from "@/lib/bac-order";
import { getRequiredGender, isGenderEligible, type Gender } from "@/lib/gender";
import { authClient } from "@/lib/auth-client";

import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverArrow,
  PopoverPopup,
  PopoverPortal,
  PopoverPositioner,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  evaluateFormula,
  getFormulaCalculation,
} from "@/lib/formula-evaluator";
import {
  getScoreWithGeographicBonus,
  hasGeographicBonus,
  isGreaterTunisGovernorate,
  isGeographicBonusApplicable,
  isSameGeographicBonusZone,
} from "@/lib/geographic-bonus";
import { getBacOptionalSubjects } from "@/lib/bac-subjects";
import {
  Tooltip,
  TooltipArrow,
  TooltipPopup,
  TooltipPortal,
  TooltipPositioner,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type SortDir = "desc" | "asc";

interface LicenseGroup {
  key: string;
  university: string;
  institution: string;
  governorate: string;
  code: string;
  license: string;
  branches: ScoreRecord[];
}

const ROWS_PER_PAGE = 25;
const LICENSES_PER_PAGE = 10;
const GREATER_TUNIS_FILTER = "greater-tunis";

function matchesGovernorateFilter(
  selectedGovernorate: string,
  recordGovernorate: string,
): boolean {
  if (selectedGovernorate === "all") return true;
  if (selectedGovernorate === GREATER_TUNIS_FILTER) {
    return isGreaterTunisGovernorate(recordGovernorate);
  }
  return selectedGovernorate === recordGovernorate;
}

function groupByLicense(records: ScoreRecord[]): LicenseGroup[] {
  const groups = new Map<string, LicenseGroup>();

  records.forEach((record) => {
    const key = [
      record.university,
      record.institution,
      record.code,
      record.license,
    ].join("\u0000");
    const group = groups.get(key);

    if (group) {
      group.branches.push(record);
      return;
    }

    groups.set(key, {
      key,
      university: record.university,
      institution: record.institution,
      governorate: record.governorate,
      code: record.code,
      license: record.license,
      branches: [record],
    });
  });

  return [...groups.values()].map((g) => ({
    ...g,
    branches: [...g.branches].sort(
      (a, b) => BAC_ORDER.indexOf(a.bacType) - BAC_ORDER.indexOf(b.bacType),
    ),
  }));
}

export function HomeClient({ initialData }: { initialData: ScoreRecord[] }) {
  const { data: session } = authClient.useSession();
  const data = initialData;
  const [search, setSearch] = useState("");
  const [bacType, setBacType] = useState<string>("all");
  const [university, setUniversity] = useState<string>("all");
  const [governorate, setGovernorate] = useState<string>("all");
  const [institution, setInstitution] = useState<string | null>(null);
  const [license, setLicense] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [minScore, setMinScore] = useState("");
  const [groupedView, setGroupedView] = useState(false);
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    if (resultsCardRef.current) {
      const top =
        resultsCardRef.current.getBoundingClientRect().top +
        window.scrollY -
        16;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };
  const [userBacType, setUserBacType] = useState<string | null>(null);
  const [userScore, setUserScore] = useState<number | null>(null);
  const [userGrades, setUserGrades] = useState<Record<string, number> | null>(
    null,
  );
  const [onlyMyBac, setOnlyMyBac] = useState(false);
  const [useGeographicBonus, setUseGeographicBonus] = useState(true);
  const [userGovernorate, setUserGovernorate] = useState<string | null>(null);
  const [userGender, setUserGender] = useState<Gender | null>(null);
  const userScoreFetched = useRef(false);
  const resultsCardRef = useRef<HTMLDivElement>(null);

  const computeBaseScore = (formula?: string | null) => {
    if (userScore === null) return null;
    return formula && formula !== "FG"
      ? evaluateFormula(formula, { FG: userScore, ...(userGrades ?? {}) })
      : userScore;
  };

  const computeEffective = (
    formula?: string | null,
    programCode?: string,
    institutionGovernorate?: string,
  ) => {
    const score = computeBaseScore(formula);
    if (score === null) return null;
    return programCode
      ? getScoreWithGeographicBonus(
          score,
          programCode,
          isGeographicBonusApplicable(
            programCode,
            userGovernorate,
            institutionGovernorate ?? "",
            useGeographicBonus,
          ),
        )
      : score;
  };

  const getCalculation = (formula?: string | null) => {
    if (!formula || userScore === null) return null;
    return getFormulaCalculation(formula, {
      FG: userScore,
      ...(userGrades ?? {}),
    });
  };

  const getUnavailableOptionalSubject = (
    bacType: string,
    formula?: string | null,
  ) => {
    if (!formula || userBacType !== bacType || !userGrades) return null;
    return (
      getBacOptionalSubjects(bacType).find(({ code }) => {
        const isRequired = new RegExp(`\\b${code}\\b`, "i").test(formula);
        return isRequired && userGrades[code] === undefined;
      }) ?? null
    );
  };

  const getGenderUnavailableMessage = (licenseName: string) => {
    const requiredGender = getRequiredGender(licenseName);
    if (!requiredGender || !userGender || requiredGender === userGender)
      return null;
    return `غير مؤهل: هذه الإجازة مخصّصة ${requiredGender === "female" ? "للإناث" : "للذكور"}`;
  };

  const getRowStatus = (
    bacType: string,
    score: number,
    formula?: string | null,
    programCode?: string,
    institutionGovernorate?: string,
    licenseName?: string,
  ) => {
    if (licenseName && !isGenderEligible(licenseName, userGender))
      return "gender-unavailable";
    if (userScore === null || userBacType !== bacType) return null;
    if (getUnavailableOptionalSubject(bacType, formula)) return "unavailable";
    const effective = computeEffective(
      formula,
      programCode,
      institutionGovernorate,
    );
    if (effective === null) return null;
    if (effective >= score) return "qualified";
    if (score > effective + 15) return "far";
    return "close";
  };

  const getRowColorClasses = (
    status: ReturnType<typeof getRowStatus>,
    colorCells = false,
  ) => {
    const cellColors = colorCells
      ? status === "qualified"
        ? "[&>td]:bg-success/5 hover:[&>td]:bg-success/10"
        : status === "close"
          ? "[&>td]:bg-warning/5 hover:[&>td]:bg-warning/10"
          : status === "far"
            ? "[&>td]:bg-error/5 hover:[&>td]:bg-error/10"
            : status === "unavailable" || status === "gender-unavailable"
              ? "[&>td]:bg-surface-strong/35 hover:[&>td]:bg-surface-strong/60"
              : ""
      : "";
    const rowColors =
      status === "qualified"
        ? "bg-success/5 hover:bg-success/10"
        : status === "close"
          ? "bg-warning/5 hover:bg-warning/10"
          : status === "far"
            ? "bg-error/5 hover:bg-error/10"
            : status === "unavailable" || status === "gender-unavailable"
              ? "bg-surface-strong/35 text-muted-text hover:bg-surface-strong/60"
              : "hover:bg-surface-soft/50";
    return `${rowColors} ${cellColors}`;
  };

  useEffect(() => {
    if (!session || userScoreFetched.current) return;
    userScoreFetched.current = true;
    fetch("/api/student-score")
      .then((r) => r.json())
      .then((payload) => {
        if (payload.bacType) {
          setUserBacType(payload.bacType);
          setOnlyMyBac(true);
        }
        if (payload.governorate) {
          setUserGovernorate(payload.governorate);
          setGovernorate(
            isGreaterTunisGovernorate(payload.governorate)
              ? GREATER_TUNIS_FILTER
              : payload.governorate,
          );
        }
        if (payload.gender) setUserGender(payload.gender as Gender);
        if (payload.score?.fg != null) {
          setUserScore(Number(payload.score.fg));
        }
        if (payload.score?.grades) {
          const grades: Record<string, number> = {};
          for (const [k, v] of Object.entries(payload.score.grades)) {
            grades[k] = Number(v);
          }
          setUserGrades(grades);
        }
      })
      .catch(() => {});
  }, [session]);

  const bacTypes = useMemo(
    () =>
      [...new Set(data.map((r) => r.bacType))].sort(
        (a, b) => BAC_ORDER.indexOf(a) - BAC_ORDER.indexOf(b),
      ),
    [data],
  );

  const universities = useMemo(() => {
    const available = data.filter(
      (record) =>
        matchesGovernorateFilter(governorate, record.governorate) &&
        (!institution || record.institution === institution) &&
        (!license || record.license === license),
    );
    return [...new Set(available.map((record) => record.university))].sort();
  }, [data, governorate, institution, license]);

  const institutions = useMemo(() => {
    const available = data.filter(
      (record) =>
        matchesGovernorateFilter(governorate, record.governorate) &&
        (university === "all" || record.university === university) &&
        (!license || record.license === license),
    );
    return [...new Set(available.map((record) => record.institution))].sort();
  }, [data, governorate, university, license]);

  const licenses = useMemo(() => {
    const available = data.filter(
      (record) =>
        matchesGovernorateFilter(governorate, record.governorate) &&
        (university === "all" || record.university === university) &&
        (!institution || record.institution === institution),
    );
    return [...new Set(available.map((record) => record.license))].sort();
  }, [data, governorate, university, institution]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data
      .filter((r) => {
        if (bacType !== "all" && r.bacType !== bacType && !onlyMyBac)
          return false;
        if (onlyMyBac && userBacType && r.bacType !== userBacType) return false;
        if (university !== "all" && r.university !== university) return false;
        if (!matchesGovernorateFilter(governorate, r.governorate)) return false;
        if (institution && r.institution !== institution) return false;
        if (license && r.license !== license) return false;
        if (minScore && r.score > parseFloat(minScore)) return false;
        if (q) {
          const match =
            r.institution.toLowerCase().includes(q) ||
            r.license.toLowerCase().includes(q) ||
            r.code.includes(q) ||
            r.university.toLowerCase().includes(q);
          if (!match) return false;
        }
        return true;
      })
      .sort((a, b) =>
        sortDir === "desc" ? b.score - a.score : a.score - b.score,
      );
  }, [
    data,
    search,
    bacType,
    university,
    governorate,
    institution,
    license,
    minScore,
    sortDir,
    onlyMyBac,
    userBacType,
  ]);

  const filteredLicenseGroups = useMemo(
    () => groupByLicense(filtered),
    [filtered],
  );
  const resultCount = groupedView
    ? filteredLicenseGroups.length
    : filtered.length;
  const pageSize = groupedView ? LICENSES_PER_PAGE : ROWS_PER_PAGE;
  const totalPages = Math.max(1, Math.ceil(resultCount / pageSize));

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * ROWS_PER_PAGE;
    return filtered.slice(start, start + ROWS_PER_PAGE);
  }, [filtered, page]);

  const paginatedGroups = useMemo(() => {
    const start = (page - 1) * LICENSES_PER_PAGE;
    return filteredLicenseGroups.slice(start, start + LICENSES_PER_PAGE);
  }, [filteredLicenseGroups, page]);

  return (
    <div className="flex flex-col flex-1">
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-6">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>بحث وتصفية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_108px_176px_144px]">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-text" />
                <Input
                  placeholder="بحث بالمؤسسة أو الإجازة أو الرمز..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pr-9"
                />
              </div>
              <div className="relative">
                <Input
                  type="number"
                  min="60"
                  max="230"
                  step="0.01"
                  placeholder="النقاط ≤"
                  value={minScore}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v !== "" && !/^\d+(\.\d*)?$/.test(v)) return;
                    setMinScore(v);
                    setPage(1);
                  }}
                  className="[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:m-0 [&::-webkit-outer-spin-button]:m-0 [-moz-appearance:textfield]"
                />
              </div>
              <Select
                value={bacType}
                onValueChange={(v) => {
                  if (!v) return;
                  setBacType(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="الباكالوريا">
                    {bacType === "all" ? "كل الشعب" : bacType}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الشعب</SelectItem>
                  {bacTypes.map((bt) => (
                    <SelectItem key={bt} value={bt}>
                      {bt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={sortDir}
                onValueChange={(v) => {
                  if (!v) return;
                  setSortDir(v as SortDir);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="الترتيب">
                    {sortDir === "desc" ? "الأعلى أولا" : "الأدنى أولا"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">الأعلى أولا</SelectItem>
                  <SelectItem value="asc">الأدنى أولا</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-[220px_280px_1fr_1fr]">
              <Select
                value={governorate}
                onValueChange={(value) => {
                  if (!value) return;
                  setGovernorate(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="الولاية">
                    {governorate === "all"
                      ? "كل الولايات"
                      : governorate === GREATER_TUNIS_FILTER
                        ? "تونس الكبرى"
                        : governorate}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent listClassName="max-h-72" showScrollbar>
                  <SelectItem value="all">كل الولايات</SelectItem>
                  <SelectItem value={GREATER_TUNIS_FILTER}>
                    تونس الكبرى
                  </SelectItem>
                  {TUNISIA_GOVERNORATES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={university}
                onValueChange={(v) => {
                  if (!v) return;
                  setUniversity(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="الجامعة">
                    {university === "all" ? "كل الجامعات" : university}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent listClassName="max-h-72" showScrollbar>
                  <SelectItem value="all">كل الجامعات</SelectItem>
                  {universities.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Combobox
                items={institutions}
                value={institution}
                onValueChange={(value) => {
                  setInstitution(value);
                  setPage(1);
                }}
                placeholder="المؤسسة"
                searchPlaceholder="ابحث عن مؤسسة..."
                emptyMessage="لا توجد مؤسسة مطابقة"
              />
              <Combobox
                items={licenses}
                value={license}
                onValueChange={(value) => {
                  setLicense(value);
                  setPage(1);
                }}
                placeholder="الشعبة الجامعية"
                searchPlaceholder="ابحث عن شعبة جامعية..."
                emptyMessage="لا توجد شعبة مطابقة"
              />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-start gap-3 border-t border-border pt-4">
              {session && (
                <label className="inline-flex min-h-11 items-center gap-3 rounded-md px-2 text-sm font-medium text-ink transition-colors hover:bg-surface-strong/70">
                  <Switch
                    checked={onlyMyBac}
                    disabled={!userBacType}
                    onCheckedChange={(v) => {
                      setOnlyMyBac(v);
                      setPage(1);
                    }}
                  />
                  شعبتي فقط
                </label>
              )}
              {session && userScore !== null && (
                <label className="flex min-h-11 items-center gap-3 rounded-md px-2 text-sm font-medium text-ink transition-colors hover:bg-surface-strong/70">
                  <Switch
                    checked={useGeographicBonus}
                    onCheckedChange={setUseGeographicBonus}
                    aria-label="تطبيق التنفيل الجغرافي بنسبة 7%"
                  />
                  <span className="flex flex-col">
                    <span>تطبيق التنفيل الجغرافي (+7%)</span>
                    <span className="text-xs font-normal text-muted-text">
                      فقط إذا كانت الشعبة في ولايتك، أو في أقرب مؤسسة إلى مركز
                      ولايتك عند عدم توفرها
                    </span>
                  </span>
                </label>
              )}
              {(!onlyMyBac || !userBacType) && (
                <label className="hidden min-h-11 items-center gap-3 rounded-md px-2 text-sm font-medium text-ink transition-colors hover:bg-surface-strong/70 md:inline-flex">
                  <Switch
                    checked={groupedView}
                    onCheckedChange={(v) => {
                      setGroupedView(v);
                      setPage(1);
                    }}
                  />
                  تجميع الشعب حسب الإجازة
                </label>
              )}
              {(search ||
                bacType !== "all" ||
                university !== "all" ||
                governorate !== "all" ||
                institution ||
                license ||
                minScore) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setBacType("all");
                    setUniversity("all");
                    setGovernorate("all");
                    setInstitution(null);
                    setLicense(null);
                    setMinScore("");
                    setSortDir("desc");
                    setPage(1);
                  }}
                  className="mr-auto"
                >
                  إلغاء التصفية
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card ref={resultsCardRef} className="pb-0">
          <CardHeader>
            <CardTitle>
              النتائج{" "}
              <span className="text-muted-text text-sm font-normal">
                {groupedView
                  ? `(${filteredLicenseGroups.length} إجازة)`
                  : `(${filtered.length} ${filtered.length < 10 ? "نتائج" : "نتيجة"})`}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-3 px-3 pb-4 md:hidden">
              {filtered.length === 0 ? (
                <div className="rounded-lg bg-surface-soft px-4 py-12 text-center text-sm text-muted-text ring-1 ring-border">
                  لا توجد نتائج تطابق بحثك
                </div>
              ) : (
                paginatedRows.map((record, index) => {
                  const status = getRowStatus(
                    record.bacType,
                    record.score,
                    record.formula,
                    record.code,
                    record.governorate,
                    record.license,
                  );
                  const effective = computeEffective(
                    record.formula,
                    record.code,
                    record.governorate,
                  );
                  const unavailable = getUnavailableOptionalSubject(
                    record.bacType,
                    record.formula,
                  );
                  const genderUnavailable = getGenderUnavailableMessage(
                    record.license,
                  );
                  const statusColor =
                    status === "qualified"
                      ? "text-success"
                      : status === "close"
                        ? "text-warning"
                        : status === "far"
                          ? "text-error"
                          : "text-muted-text";

                  return (
                    <Dialog key={`${record.code}-${record.bacType}-${index}`}>
                      <DialogTrigger
                        render={
                          <button
                            type="button"
                            className="block w-full text-right"
                          />
                        }
                      >
                        <Card
                          className={`gap-0 py-0 ${status === "qualified" ? "bg-success/[0.04]" : status === "close" ? "bg-warning/[0.04]" : status === "far" ? "bg-error/[0.04]" : "bg-canvas"}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-2 font-mono text-xs text-muted-text">
                                <span>{record.code}</span>
                                {status === "qualified" && (
                                  <Check className="size-3.5 text-success" />
                                )}
                                {status === "close" && (
                                  <ArrowUp className="size-3.5 text-warning" />
                                )}
                                {status === "far" && (
                                  <X className="size-3.5 text-error" />
                                )}
                                {(status === "unavailable" ||
                                  status === "gender-unavailable") && (
                                  <CircleSlash2 className="size-3.5 text-muted-text" />
                                )}
                              </div>
                              <div className="shrink-0 text-left">
                                <span className="block text-xs text-muted-text">
                                  الحد الأدنى
                                </span>
                                <strong
                                  className={`font-mono text-base tabular-nums ${statusColor}`}
                                  dir="ltr"
                                >
                                  {record.score.toFixed(4)}
                                </strong>
                              </div>
                            </div>

                            <h3 className="mt-3 line-clamp-2 text-title-sm font-semibold leading-6 text-ink">
                              {record.license}
                            </h3>
                            {genderUnavailable && (
                              <p className="mt-2 text-xs font-medium text-muted-text">
                                {genderUnavailable}
                              </p>
                            )}
                            <p className="mt-2 line-clamp-1 text-sm font-medium leading-5 text-body">
                              {record.university}
                            </p>
                            <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-text">
                              {record.institution}
                            </p>

                            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3 text-caption">
                              <span className="rounded-full bg-surface-card px-2.5 py-1 font-medium text-ink">
                                {record.bacType}
                              </span>
                              {hasGeographicBonus(record.code) &&
                                isGenderEligible(record.license, userGender) &&
                                (!userGovernorate ||
                                  isSameGeographicBonusZone(
                                    userGovernorate,
                                    record.governorate,
                                  )) && (
                                  <span
                                    className="rounded-full bg-brand-mint/60 px-2.5 py-1 font-semibold text-ink"
                                    dir="ltr"
                                  >
                                    +7%
                                  </span>
                                )}
                              <span
                                className="min-w-0 flex-1 truncate text-left font-mono text-xs text-body"
                                dir="ltr"
                              >
                                {record.formula ?? "FG"}
                              </span>
                            </div>
                          </CardContent>
                          <CardFooter className="justify-between px-4 py-3 text-caption font-semibold text-ink">
                            <span>عرض التفاصيل</span>
                            <ChevronLeft className="size-4" />
                          </CardFooter>
                        </Card>
                      </DialogTrigger>

                      <DialogContent className="top-auto! bottom-0! left-0! w-full! max-w-none! translate-x-0! translate-y-0! rounded-b-none rounded-t-xl p-5 [&_[data-slot=dialog-close]]:right-auto [&_[data-slot=dialog-close]]:left-3 [&_[data-slot=dialog-close]]:top-3">
                        <DialogHeader>
                          <DialogTitle className="pe-10 text-right text-title-md leading-7">
                            {record.license}
                          </DialogTitle>
                          <DialogDescription className="text-right">
                            الرمز {record.code} · {record.university}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="rounded-lg bg-surface-soft p-4">
                            <p className="text-xs text-muted-text">المؤسسة</p>
                            <p className="mt-1 leading-6 text-ink">
                              {record.institution}
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="rounded-lg bg-surface-card p-3">
                              <span className="text-xs text-muted-text">
                                شعبة الباكالوريا
                              </span>
                              <strong className="mt-1 block text-ink">
                                {record.bacType}
                              </strong>
                            </div>
                            <div className="rounded-lg bg-surface-card p-3">
                              <span className="text-xs text-muted-text">
                                الحد الأدنى
                              </span>
                              <strong
                                className="mt-1 block text-right font-mono text-ink"
                                dir="ltr"
                              >
                                {record.score.toFixed(4)}
                              </strong>
                            </div>
                          </div>
                          <div className="rounded-lg bg-surface-soft p-4">
                            <p className="text-xs text-muted-text">
                              صيغة الاحتساب
                            </p>
                            <p
                              className="mt-1 break-all text-right font-mono text-sm leading-6 text-ink"
                              dir="ltr"
                            >
                              {record.formula ?? "FG"}
                            </p>
                            {(() => {
                              const calculation =
                                userBacType === record.bacType
                                  ? getCalculation(record.formula)
                                  : null;
                              if (!calculation) return null;
                              return (
                                <div
                                  className="mt-2 border-t border-border/50 pt-2 text-right font-mono text-xs leading-relaxed text-muted-text"
                                  dir="ltr"
                                >
                                  <div className="truncate">
                                    = {calculation.substituted}
                                  </div>
                                  <div className="mt-1 font-semibold text-ink">
                                    = {calculation.result.toFixed(4)}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                          {userScore === null && !genderUnavailable && (
                            <div className="rounded-lg bg-brand-mint/45 p-4 ring-1 ring-brand-mint/70">
                              <div className="flex items-start gap-3">
                                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-brand-mint text-ink">
                                  <Calculator
                                    className="size-4"
                                    aria-hidden="true"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-ink">
                                    احسب سكورك وشوف فرصتك
                                  </p>
                                  <p className="mt-1 text-sm leading-6 text-body">
                                    احسب سكورك باش نوريولك قداش يفصلك على الحدّ
                                    الأدنى لهالإجازة في المؤسسة هاذي.
                                  </p>
                                </div>
                              </div>
                              <Button
                                nativeButton={false}
                                render={<Link href="/calculatrice" />}
                                className="mt-4 w-full"
                              >
                                نحسب سكوري
                              </Button>
                            </div>
                          )}
                          {userBacType === record.bacType &&
                            effective !== null &&
                            !unavailable &&
                            !genderUnavailable &&
                            (() => {
                              const base = computeBaseScore(record.formula);
                              const bonusApplied =
                                useGeographicBonus &&
                                isSameGeographicBonusZone(
                                  userGovernorate,
                                  record.governorate,
                                ) &&
                                hasGeographicBonus(record.code);
                              const baseColor =
                                base === null
                                  ? "text-muted-text"
                                  : base >= record.score
                                    ? "text-success"
                                    : record.score > base + 15
                                      ? "text-error"
                                      : "text-warning";
                              return (
                                <div className="rounded-lg bg-brand-mint/25 p-4 text-sm">
                                  {bonusApplied && base !== null && (
                                    <div className="mb-3 pb-3 border-b border-border/50 grid grid-cols-2 gap-3">
                                      <div>
                                        <span className="text-xs text-muted-text">
                                          سكورك قبل التنفيل
                                        </span>
                                        <strong
                                          className="mt-1 block text-right font-mono text-ink"
                                          dir="ltr"
                                        >
                                          {base.toFixed(4)}
                                        </strong>
                                      </div>
                                      <div>
                                        <span className="text-xs text-muted-text">
                                          الفارق
                                        </span>
                                        <strong
                                          className={`mt-1 block text-right font-mono ${baseColor}`}
                                          dir="ltr"
                                        >
                                          {base >= record.score ? "+" : ""}
                                          {(base - record.score).toFixed(4)}
                                        </strong>
                                      </div>
                                    </div>
                                  )}
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <span className="text-xs text-muted-text">
                                        {bonusApplied
                                          ? "سكورك بعد التنفيل"
                                          : "سكورك"}
                                      </span>
                                      <strong
                                        className="mt-1 block text-right font-mono text-ink"
                                        dir="ltr"
                                      >
                                        {effective.toFixed(4)}
                                      </strong>
                                    </div>
                                    <div>
                                      <span className="text-xs text-muted-text">
                                        الفارق
                                      </span>
                                      <strong
                                        className={`mt-1 block text-right font-mono ${statusColor}`}
                                        dir="ltr"
                                      >
                                        {effective >= record.score ? "+" : ""}
                                        {(effective - record.score).toFixed(4)}
                                      </strong>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          {unavailable && (
                            <p className="rounded-lg bg-surface-strong p-3 text-sm text-muted-text">
                              غير متاح: تتطلب الصيغة مادة {unavailable.label}.
                            </p>
                          )}
                          {genderUnavailable && (
                            <p className="flex items-center gap-2 rounded-lg bg-surface-strong p-3 text-sm font-medium text-muted-text">
                              <CircleSlash2 className="size-4 shrink-0" />{" "}
                              {genderUnavailable}
                            </p>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  );
                })
              )}
            </div>

            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">الرمز</TableHead>
                    <TableHead className="w-[190px]">الجامعة</TableHead>
                    <TableHead className="hidden w-[250px] md:table-cell">
                      المؤسسة
                    </TableHead>
                    <TableHead className="w-[210px]">الإجازة</TableHead>
                    <TableHead className="w-[84px] text-center">
                      التنفيل
                    </TableHead>
                    <TableHead className="w-[120px]">
                      شعبة الباكالوريا
                    </TableHead>
                    <TableHead className="w-[180px]">الصيغة</TableHead>
                    <TableHead className="w-[80px] text-right">
                      النقاط
                    </TableHead>
                  </TableRow>
                </TableHeader>
                {groupedView ? (
                  paginatedGroups.map((group) => {
                    const bestIdx = group.branches.reduce(
                      (maxIdx, b, i, arr) =>
                        b.score > arr[maxIdx].score ? i : maxIdx,
                      0,
                    );
                    const isHovered = hoveredGroup === group.key;
                    const branchStatuses = group.branches.map((b) =>
                      getRowStatus(
                        b.bacType,
                        b.score,
                        b.formula,
                        b.code,
                        b.governorate,
                        b.license,
                      ),
                    );
                    const anyQualified = branchStatuses.includes("qualified");
                    const anyClose = branchStatuses.includes("close");
                    const anyFar = branchStatuses.includes("far");
                    const allUnavailable = branchStatuses.every(
                      (status) =>
                        status === "unavailable" ||
                        status === "gender-unavailable",
                    );
                    const groupIcon = anyQualified
                      ? { icon: Check, color: "text-success" }
                      : anyClose
                        ? { icon: ArrowUp, color: "text-warning" }
                        : anyFar
                          ? { icon: X, color: "text-error" }
                          : allUnavailable
                            ? { icon: CircleSlash2, color: "text-muted-text" }
                            : null;
                    return (
                      <tbody
                        key={group.key}
                        onMouseEnter={() => setHoveredGroup(group.key)}
                        onMouseLeave={() => setHoveredGroup(null)}
                      >
                        {group.branches.map((branch, branchIndex) => {
                          const status = getRowStatus(
                            branch.bacType,
                            branch.score,
                            branch.formula,
                            branch.code,
                            branch.governorate,
                            branch.license,
                          );
                          const bgClass = getRowColorClasses(status);
                          return (
                            <TableRow
                              key={`${group.key}-${branch.bacType}-${branchIndex}`}
                              className={`${branchIndex === 0 ? "border-t border-border" : "border-border/60"} ${isHovered && branchIndex === bestIdx && !status ? "bg-surface-soft/80!" : ""} ${bgClass}`}
                            >
                              {branchIndex === 0 && (
                                <>
                                  <TableCell
                                    rowSpan={group.branches.length}
                                    className={`align-top font-mono text-xs ${isHovered && bestIdx !== 0 ? "bg-surface-soft/80!" : ""}`}
                                  >
                                    {group.code}
                                    {groupIcon && (
                                      <groupIcon.icon
                                        className={`size-3.5 inline align-middle ms-1 ${groupIcon.color}`}
                                      />
                                    )}
                                  </TableCell>
                                  <TableCell
                                    rowSpan={group.branches.length}
                                    className={`align-top ${isHovered && bestIdx !== 0 ? "bg-surface-soft/80!" : ""}`}
                                  >
                                    <span className="line-clamp-2 whitespace-normal leading-5">
                                      {group.university}
                                    </span>
                                  </TableCell>
                                  <TableCell
                                    rowSpan={group.branches.length}
                                    className={`hidden max-w-xs align-top md:table-cell ${isHovered && bestIdx !== 0 ? "bg-surface-soft/80!" : ""}`}
                                  >
                                    <Tooltip>
                                      <TooltipTrigger
                                        delay={500}
                                        render={
                                          <span className="line-clamp-2 whitespace-normal leading-5" />
                                        }
                                      >
                                        {group.institution}
                                      </TooltipTrigger>
                                      <TooltipPortal>
                                        <TooltipPositioner sideOffset={8}>
                                          <TooltipPopup>
                                            <TooltipArrow />
                                            {group.institution}
                                          </TooltipPopup>
                                        </TooltipPositioner>
                                      </TooltipPortal>
                                    </Tooltip>
                                    <span className="mt-1 block text-xs font-medium text-muted-text">
                                      ولاية {group.governorate}
                                    </span>
                                  </TableCell>
                                  <TableCell
                                    rowSpan={group.branches.length}
                                    className={`align-top font-medium ${isHovered && bestIdx !== 0 ? "bg-surface-soft/80!" : ""}`}
                                  >
                                    <Tooltip>
                                      <TooltipTrigger
                                        delay={500}
                                        render={
                                          <span className="line-clamp-2 whitespace-normal leading-5" />
                                        }
                                      >
                                        {group.license}
                                      </TooltipTrigger>
                                      <TooltipPortal>
                                        <TooltipPositioner sideOffset={8}>
                                          <TooltipPopup>
                                            <TooltipArrow />
                                            {group.license}
                                          </TooltipPopup>
                                        </TooltipPositioner>
                                      </TooltipPortal>
                                    </Tooltip>
                                    {getGenderUnavailableMessage(
                                      group.license,
                                    ) && (
                                      <span className="mt-2 flex items-center gap-1 text-xs font-medium text-muted-text">
                                        <CircleSlash2 className="size-3.5" />{" "}
                                        {getGenderUnavailableMessage(
                                          group.license,
                                        )}
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell
                                    rowSpan={group.branches.length}
                                    className={`align-top text-center ${isHovered && bestIdx !== 0 ? "bg-surface-soft/80!" : ""}`}
                                  >
                                    {hasGeographicBonus(group.code) &&
                                    isGenderEligible(
                                      group.license,
                                      userGender,
                                    ) &&
                                    (userGovernorate === null ||
                                      isSameGeographicBonusZone(
                                        userGovernorate,
                                        group.governorate,
                                      )) ? (
                                      <span
                                        className="inline-flex rounded-full bg-brand-mint/60 px-2.5 py-1 text-[11px] font-semibold text-ink"
                                        dir="ltr"
                                      >
                                        +7%
                                      </span>
                                    ) : (
                                      <span className="text-muted-soft">—</span>
                                    )}
                                  </TableCell>
                                </>
                              )}
                              <TableCell>{branch.bacType}</TableCell>
                              <TableCell
                                className="max-w-48 font-mono text-xs"
                                dir="ltr"
                              >
                                <Popover>
                                  <PopoverTrigger
                                    disabled={
                                      Boolean(
                                        getUnavailableOptionalSubject(
                                          branch.bacType,
                                          branch.formula,
                                        ),
                                      ) ||
                                      !isGenderEligible(
                                        branch.license,
                                        userGender,
                                      )
                                    }
                                    openOnHover
                                    delay={500}
                                    render={
                                      <button
                                        type="button"
                                        className="block w-full cursor-help truncate bg-transparent p-0 text-right"
                                      />
                                    }
                                  >
                                    <span className="block truncate" dir="ltr">
                                      {branch.formula ?? "—"}
                                    </span>
                                    {getUnavailableOptionalSubject(
                                      branch.bacType,
                                      branch.formula,
                                    ) && (
                                      <span className="mt-1 flex items-center gap-1 font-sans text-[11px] text-muted-text">
                                        <CircleSlash2 className="size-3" />
                                        غير متاح · يتطلب{" "}
                                        {
                                          getUnavailableOptionalSubject(
                                            branch.bacType,
                                            branch.formula,
                                          )?.label
                                        }
                                      </span>
                                    )}
                                  </PopoverTrigger>
                                  <PopoverPortal>
                                    <PopoverPositioner sideOffset={8}>
                                      <PopoverPopup>
                                        <PopoverArrow />
                                        {(() => {
                                          const calculation =
                                            userBacType === branch.bacType
                                              ? getCalculation(branch.formula)
                                              : null;
                                          if (!calculation)
                                            return branch.formula ?? "—";
                                          return (
                                            <span
                                              className="block whitespace-nowrap text-xs leading-relaxed"
                                              dir="ltr"
                                            >
                                              <span className="block">
                                                {branch.formula}
                                              </span>
                                              <span className="block text-muted-text">
                                                = {calculation.substituted}
                                              </span>
                                              <span className="block font-semibold text-ink">
                                                ={" "}
                                                {calculation.result.toFixed(4)}
                                              </span>
                                            </span>
                                          );
                                        })()}
                                      </PopoverPopup>
                                    </PopoverPositioner>
                                  </PopoverPortal>
                                </Popover>
                              </TableCell>
                              <TableCell className="text-right font-medium tabular-nums">
                                {userBacType === branch.bacType &&
                                userScore !== null &&
                                isGenderEligible(branch.license, userGender) ? (
                                  <Popover>
                                    <PopoverTrigger
                                      disabled={Boolean(
                                        getUnavailableOptionalSubject(
                                          branch.bacType,
                                          branch.formula,
                                        ),
                                      )}
                                      openOnHover
                                      delay={500}
                                      render={
                                        <button
                                          type="button"
                                          className="cursor-help bg-transparent p-0 font-medium tabular-nums"
                                        />
                                      }
                                    >
                                      {branch.score.toFixed(4)}
                                    </PopoverTrigger>
                                    <PopoverPortal>
                                      <PopoverPositioner sideOffset={8}>
                                        <PopoverPopup>
                                          <PopoverArrow />
                                          {(() => {
                                            const base = computeBaseScore(
                                              branch.formula,
                                            );
                                            const eff = computeEffective(
                                              branch.formula,
                                              branch.code,
                                              branch.governorate,
                                            );
                                            if (
                                              eff === null ||
                                              userBacType !== branch.bacType
                                            )
                                              return null;
                                            const bonusApplied =
                                              useGeographicBonus &&
                                              isSameGeographicBonusZone(
                                                userGovernorate,
                                                branch.governorate,
                                              ) &&
                                              hasGeographicBonus(branch.code);
                                            return (
                                              <span className="whitespace-nowrap text-xs leading-relaxed">
                                                {bonusApplied &&
                                                  base !== null && (
                                                    <>
                                                      <span className="block">
                                                        السكور قبل التنفيل:{" "}
                                                        <b
                                                          dir="ltr"
                                                          className="inline-block tabular-nums"
                                                        >
                                                          {base.toFixed(4)}
                                                        </b>
                                                      </span>
                                                      <span className="block text-success">
                                                        التنفيل:{" "}
                                                        <b
                                                          dir="ltr"
                                                          className="inline-block tabular-nums"
                                                        >
                                                          × 1.07
                                                        </b>
                                                      </span>
                                                    </>
                                                  )}
                                                <span className="block">
                                                  {bonusApplied
                                                    ? "سكورك بعد التنفيل"
                                                    : "سكورك"}
                                                  :{" "}
                                                  <b
                                                    dir="ltr"
                                                    className="inline-block tabular-nums"
                                                  >
                                                    {eff.toFixed(4)}
                                                  </b>
                                                </span>
                                                <span className="block">
                                                  الحد:{" "}
                                                  <b
                                                    dir="ltr"
                                                    className="inline-block tabular-nums"
                                                  >
                                                    {branch.score.toFixed(4)}
                                                  </b>
                                                </span>
                                                <span className="block text-right">
                                                  <span className="text-ink">
                                                    الفارق:{" "}
                                                  </span>
                                                  <b
                                                    dir="ltr"
                                                    className={`inline-block tabular-nums ${
                                                      eff >= branch.score
                                                        ? "text-success"
                                                        : branch.score - eff <=
                                                            15
                                                          ? "text-warning"
                                                          : "text-error"
                                                    }`}
                                                  >
                                                    {eff >= branch.score
                                                      ? "+"
                                                      : ""}
                                                    {(
                                                      eff - branch.score
                                                    ).toFixed(4)}
                                                  </b>
                                                </span>
                                              </span>
                                            );
                                          })()}
                                        </PopoverPopup>
                                      </PopoverPositioner>
                                    </PopoverPortal>
                                  </Popover>
                                ) : (
                                  branch.score.toFixed(4)
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </tbody>
                    );
                  })
                ) : (
                  <TableBody>
                    {resultCount === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center text-muted-text py-12"
                        >
                          لا توجد نتائج تطابق بحثك
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedRows.map((r, i) => (
                        <TableRow
                          key={`${r.code}-${r.bacType}-${i}`}
                          className={getRowColorClasses(
                            getRowStatus(
                              r.bacType,
                              r.score,
                              r.formula,
                              r.code,
                              r.governorate,
                              r.license,
                            ),
                            true,
                          )}
                        >
                          <TableCell className="font-mono text-xs">
                            {r.code}
                            {getRowStatus(
                              r.bacType,
                              r.score,
                              r.formula,
                              r.code,
                              r.governorate,
                              r.license,
                            ) === "qualified" && (
                              <Check className="size-3.5 text-success inline align-middle ms-1" />
                            )}
                            {getRowStatus(
                              r.bacType,
                              r.score,
                              r.formula,
                              r.code,
                              r.governorate,
                              r.license,
                            ) === "close" && (
                              <ArrowUp className="size-3.5 text-warning inline align-middle ms-1" />
                            )}
                            {getRowStatus(
                              r.bacType,
                              r.score,
                              r.formula,
                              r.code,
                              r.governorate,
                              r.license,
                            ) === "far" && (
                              <X className="size-3.5 text-error inline align-middle ms-1" />
                            )}
                            {getRowStatus(
                              r.bacType,
                              r.score,
                              r.formula,
                              r.code,
                              r.governorate,
                              r.license,
                            ) === "unavailable" ||
                            getRowStatus(
                              r.bacType,
                              r.score,
                              r.formula,
                              r.code,
                              r.governorate,
                              r.license,
                            ) === "gender-unavailable" ? (
                              <CircleSlash2 className="size-3.5 text-muted-text inline align-middle ms-1" />
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <span className="line-clamp-2 whitespace-normal leading-5">
                              {r.university}
                            </span>
                          </TableCell>
                          <TableCell className="hidden max-w-xs md:table-cell">
                            <Tooltip>
                              <TooltipTrigger
                                delay={500}
                                render={
                                  <span className="line-clamp-2 whitespace-normal leading-5" />
                                }
                              >
                                {r.institution}
                              </TooltipTrigger>
                              <TooltipPortal>
                                <TooltipPositioner sideOffset={8}>
                                  <TooltipPopup>
                                    <TooltipArrow />
                                    {r.institution}
                                  </TooltipPopup>
                                </TooltipPositioner>
                              </TooltipPortal>
                            </Tooltip>
                            <span className="mt-1 block text-xs font-medium text-muted-text">
                              ولاية {r.governorate}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger
                                delay={500}
                                render={
                                  <span className="line-clamp-2 whitespace-normal leading-5" />
                                }
                              >
                                {r.license}
                              </TooltipTrigger>
                              <TooltipPortal>
                                <TooltipPositioner sideOffset={8}>
                                  <TooltipPopup>
                                    <TooltipArrow />
                                    {r.license}
                                  </TooltipPopup>
                                </TooltipPositioner>
                              </TooltipPortal>
                            </Tooltip>
                            {getGenderUnavailableMessage(r.license) && (
                              <span className="mt-2 flex items-center gap-1 text-xs font-medium text-muted-text">
                                <CircleSlash2 className="size-3.5" />{" "}
                                {getGenderUnavailableMessage(r.license)}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {hasGeographicBonus(r.code) &&
                            isGenderEligible(r.license, userGender) &&
                            (userGovernorate === null ||
                              isSameGeographicBonusZone(
                                userGovernorate,
                                r.governorate,
                              )) ? (
                              <span
                                className="inline-flex rounded-full bg-brand-mint/60 px-2.5 py-1 text-[11px] font-semibold text-ink"
                                dir="ltr"
                              >
                                +7%
                              </span>
                            ) : (
                              <span className="text-muted-soft">—</span>
                            )}
                          </TableCell>
                          <TableCell>{r.bacType}</TableCell>
                          <TableCell
                            className="max-w-48 font-mono text-xs"
                            dir="ltr"
                          >
                            <Popover>
                              <PopoverTrigger
                                disabled={
                                  Boolean(
                                    getUnavailableOptionalSubject(
                                      r.bacType,
                                      r.formula,
                                    ),
                                  ) || !isGenderEligible(r.license, userGender)
                                }
                                openOnHover
                                delay={500}
                                render={
                                  <button
                                    type="button"
                                    className="block w-full cursor-help truncate bg-transparent p-0 text-right"
                                  />
                                }
                              >
                                <span className="block truncate" dir="ltr">
                                  {r.formula ?? "—"}
                                </span>
                                {getUnavailableOptionalSubject(
                                  r.bacType,
                                  r.formula,
                                ) && (
                                  <span className="mt-1 flex items-center gap-1 font-sans text-[11px] text-muted-text">
                                    <CircleSlash2 className="size-3" />
                                    غير متاح · يتطلب{" "}
                                    {
                                      getUnavailableOptionalSubject(
                                        r.bacType,
                                        r.formula,
                                      )?.label
                                    }
                                  </span>
                                )}
                              </PopoverTrigger>
                              <PopoverPortal>
                                <PopoverPositioner sideOffset={8}>
                                  <PopoverPopup>
                                    <PopoverArrow />
                                    {(() => {
                                      const calculation =
                                        userBacType === r.bacType
                                          ? getCalculation(r.formula)
                                          : null;
                                      if (!calculation) return r.formula ?? "—";
                                      return (
                                        <span
                                          className="block whitespace-nowrap text-xs leading-relaxed"
                                          dir="ltr"
                                        >
                                          <span className="block">
                                            {r.formula}
                                          </span>
                                          <span className="block text-muted-text">
                                            = {calculation.substituted}
                                          </span>
                                          <span className="block font-semibold text-ink">
                                            = {calculation.result.toFixed(4)}
                                          </span>
                                        </span>
                                      );
                                    })()}
                                  </PopoverPopup>
                                </PopoverPositioner>
                              </PopoverPortal>
                            </Popover>
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {userBacType === r.bacType &&
                            userScore !== null &&
                            isGenderEligible(r.license, userGender) ? (
                              <Popover>
                                <PopoverTrigger
                                  disabled={Boolean(
                                    getUnavailableOptionalSubject(
                                      r.bacType,
                                      r.formula,
                                    ),
                                  )}
                                  openOnHover
                                  delay={500}
                                  render={
                                    <button
                                      type="button"
                                      className="cursor-help bg-transparent p-0 font-medium tabular-nums"
                                    />
                                  }
                                >
                                  {r.score.toFixed(4)}
                                </PopoverTrigger>
                                <PopoverPortal>
                                  <PopoverPositioner sideOffset={8}>
                                    <PopoverPopup>
                                      <PopoverArrow />
                                      {(() => {
                                        const base = computeBaseScore(
                                          r.formula,
                                        );
                                        const eff = computeEffective(
                                          r.formula,
                                          r.code,
                                          r.governorate,
                                        );
                                        if (
                                          eff === null ||
                                          userBacType !== r.bacType
                                        )
                                          return null;
                                        const bonusApplied =
                                          useGeographicBonus &&
                                          isSameGeographicBonusZone(
                                            userGovernorate,
                                            r.governorate,
                                          ) &&
                                          hasGeographicBonus(r.code);
                                        return (
                                          <span className="whitespace-nowrap text-xs leading-relaxed">
                                            {bonusApplied && base !== null && (
                                              <>
                                                <span className="block">
                                                  السكور قبل التنفيل:{" "}
                                                  <b
                                                    dir="ltr"
                                                    className="inline-block tabular-nums"
                                                  >
                                                    {base.toFixed(4)}
                                                  </b>
                                                </span>
                                                <span className="block text-success">
                                                  التنفيل:{" "}
                                                  <b
                                                    dir="ltr"
                                                    className="inline-block tabular-nums"
                                                  >
                                                    × 1.07
                                                  </b>
                                                </span>
                                              </>
                                            )}
                                            <span className="block">
                                              {bonusApplied
                                                ? "سكورك بعد التنفيل"
                                                : "سكورك"}
                                              :{" "}
                                              <b
                                                dir="ltr"
                                                className="inline-block tabular-nums"
                                              >
                                                {eff.toFixed(4)}
                                              </b>
                                            </span>
                                            <span className="block">
                                              الحد:{" "}
                                              <b
                                                dir="ltr"
                                                className="inline-block tabular-nums"
                                              >
                                                {r.score.toFixed(4)}
                                              </b>
                                            </span>
                                            <span className="block text-right">
                                              <span className="text-ink">
                                                الفارق:{" "}
                                              </span>
                                              <b
                                                dir="ltr"
                                                className={`inline-block tabular-nums ${
                                                  eff >= r.score
                                                    ? "text-success"
                                                    : r.score - eff <= 15
                                                      ? "text-warning"
                                                      : "text-error"
                                                }`}
                                              >
                                                {eff >= r.score ? "+" : ""}
                                                {(eff - r.score).toFixed(4)}
                                              </b>
                                            </span>
                                          </span>
                                        );
                                      })()}
                                    </PopoverPopup>
                                  </PopoverPositioner>
                                </PopoverPortal>
                              </Popover>
                            ) : (
                              r.score.toFixed(4)
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                )}
              </Table>
            </div>
          </CardContent>
          <div className="-mt-(--card-spacing) border-t border-border flex min-h-14 items-center justify-center px-4 py-2">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        </Card>
      </main>

      <footer className="border-t border-border bg-surface-soft">
        <div className="mx-auto max-w-7xl px-6 py-6 text-center text-sm text-body">
          البيانات مأخوذة من دليل التوجيه الجامعي التونسي 2025-2026
        </div>
      </footer>
    </div>
  );
}
