"use client";

import { useMemo, useState } from "react";
import { Search, Plus, ChevronDown } from "lucide-react";
import type { ScoreRecord } from "@/lib/types";
import { isGenderEligible, type Gender } from "@/lib/gender";
import { getBacOptionalSubjects } from "@/lib/bac-subjects";
import {
  isGeographicBonusApplicableForRecord,
  getScoreWithGeographicBonus,
} from "@/lib/geographic-bonus";
import { evaluateFormula } from "@/lib/formula-evaluator";

const PAGE_SIZE = 20;
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ChoiceCardAddDialogProps {
  records: ScoreRecord[];
  isLoadingRecords?: boolean;
  onOpen?: () => void;
  userBacType: string | null;
  userScore: number | null;
  userGender: Gender | null;
  userGovernorate: string | null;
  userGrades: Record<string, number> | null;
  isInCard: (code: string, bacType: string) => boolean;
  onAdd: (code: string, bacType: string) => void;
  choiceCount: number;
}

export function ChoiceCardAddDialog({
  records,
  isLoadingRecords = false,
  onOpen,
  userBacType,
  userScore,
  userGender,
  userGovernorate,
  userGrades,
  isInCard,
  onAdd,
  choiceCount,
}: ChoiceCardAddDialogProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedGovernorate, setSelectedGovernorate] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [eligibleOnly, setEligibleOnly] = useState(false);
  const [geoBonusOnly, setGeoBonusOnly] = useState(false);

  const governorates = useMemo(() => {
    const set = new Set<string>();
    for (const r of records) {
      if (r.governorate) set.add(r.governorate);
    }
    return [...set].sort();
  }, [records]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const r of records) {
      if (r.category) set.add(r.category);
    }
    return [...set].sort();
  }, [records]);

  const eligibleRecords = useMemo(() => {
    if (!userBacType) return [];
    const q = query.trim().toLowerCase();
    return records
      .filter(
        (r) =>
          r.bacType === userBacType &&
          isGenderEligible(r.license, userGender) &&
          (r.code.includes(q) ||
            r.license.toLowerCase().includes(q) ||
            r.institution.toLowerCase().includes(q) ||
            r.university.toLowerCase().includes(q)),
      )
      .filter((r) => {
        if (!r.formula || !userGrades) return true;
        const missing = getBacOptionalSubjects(userBacType).find(
          ({ code }) =>
            new RegExp(`\\b${code}\\b`, "i").test(r.formula!) &&
            userGrades[code] === undefined,
        );
        return !missing;
      })
      .filter((r) => {
        if (!selectedGovernorate || !r.governorate) return true;
        return r.governorate === selectedGovernorate;
      })
      .filter((r) => {
        if (!selectedCategory || !r.category) return true;
        return r.category === selectedCategory;
      })
      .filter((r) => {
        if (!eligibleOnly || userScore === null || r.score === null) return true;
        const rawEffective = r.formula && r.formula !== "FG"
          ? evaluateFormula(r.formula, { FG: userScore, ...(userGrades ?? {}) })
          : userScore;
        if (rawEffective === null) return true;
        const finalEffective = getScoreWithGeographicBonus(
          rawEffective,
          r,
          isGeographicBonusApplicableForRecord(r, userGovernorate, records, true),
        );
        return finalEffective >= r.score;
      })
      .filter((r) => {
        if (!geoBonusOnly || !userGovernorate) return true;
        return isGeographicBonusApplicableForRecord(r, userGovernorate, records, true);
      })
      .filter((r, i, arr) => arr.findIndex((x) => x.code === r.code) === i)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }, [records, userBacType, userGender, userGrades, query, selectedGovernorate, selectedCategory, eligibleOnly, geoBonusOnly, userScore, userGovernorate]);

  const visibleRecords = eligibleRecords.slice(0, visibleCount);
  const hasMore = visibleCount < eligibleRecords.length;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) onOpen?.();
      }}
    >
      <DialogTrigger render={<Button variant="brand-mint">إضافة برنامج</Button>} />
      <DialogContent className="sm:max-w-xl [&_[data-slot=dialog-close]]:left-2 [&_[data-slot=dialog-close]]:right-auto">
        <DialogHeader>
          <DialogTitle>إضافة إلى بطاقة الاختيارات</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-soft" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            placeholder="ابحث بالرمز أو الاسم أو المؤسسة..."
            className="pr-9"
          />
        </div>

        {/* Filters */}
        <div>
          <div className="flex items-center gap-3">
            <Select
              value={selectedGovernorate}
              onValueChange={(v) => {
                setSelectedGovernorate(v === "__all__" ? null : v);
                setVisibleCount(PAGE_SIZE);
              }}
            >
              <SelectTrigger className="w-36 h-9 text-caption [&_svg]:size-3.5">
                <SelectValue placeholder="كل الولايات" />
              </SelectTrigger>
              <SelectContent showScrollbar>
                <SelectItem value="__all__">كل الولايات</SelectItem>
                {governorates.map((gov) => (
                  <SelectItem key={gov} value={gov}>{gov}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedCategory}
              onValueChange={(v) => {
                setSelectedCategory(v === "__all__" ? null : v);
                setVisibleCount(PAGE_SIZE);
              }}
            >
              <SelectTrigger className="flex-1 h-9 text-caption [&_svg]:size-3.5">
                <SelectValue placeholder="كل التصنيفات" />
              </SelectTrigger>
              <SelectContent showScrollbar>
                <SelectItem value="__all__">كل التصنيفات</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3 pt-4">
            <label className="flex cursor-pointer items-center gap-2 text-caption text-muted-text">
              <Switch
                checked={eligibleOnly}
                onCheckedChange={(c) => { setEligibleOnly(c); setVisibleCount(PAGE_SIZE); }}
              />
              المؤهلة فقط
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-caption text-muted-text">
              <Switch
                checked={geoBonusOnly}
                onCheckedChange={(c) => { setGeoBonusOnly(c); setVisibleCount(PAGE_SIZE); }}
              />
              +7% فقط
            </label>
          </div>
        </div>

        {isLoadingRecords ? (
          <p className="py-8 text-center text-sm text-muted-text">
            جاري تحميل البرامج...
          </p>
        ) : !userBacType ? (
          <p className="py-8 text-center text-sm text-muted-text">
            يجب إدخال سكورك أولاً لتظهر البرامج المتاحة
          </p>
        ) : eligibleRecords.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-text">
            {query ? "لا توجد نتائج" : "لا توجد برامج متاحة لشعبتك"}
          </p>
        ) : (
          <div
            data-slot="select-list"
            className="flex flex-col gap-0.5 max-h-[50vh] overflow-y-auto rounded-md"
          >
            {visibleRecords.map((record) => {
              const added = isInCard(record.code, record.bacType);
              const full = choiceCount >= 10 && !added;
              return (
                <div
                  key={`${record.code}-${record.bacType}`}
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-surface-soft"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="break-words text-body-sm font-medium text-ink">
                        {record.license}
                      </span>
                      <span className="shrink-0 font-mono text-caption text-muted-text">
                        {record.code}
                      </span>
                    </div>
                    <span className="block break-words text-caption text-muted-text">
                      {record.institution}
                    </span>
                  </div>
                   {record.score !== null ? (
                    <div className="flex shrink-0 items-center gap-1.5">
                      {isGeographicBonusApplicableForRecord(
                        record,
                        userGovernorate,
                        records,
                        true,
                      ) && (
                          <span className="rounded-full bg-brand-mint/60 px-1.5 py-0.5 text-caption font-semibold text-ink">
                            +7%
                          </span>
                        )}
                      <span
                        className="font-mono text-body-sm tabular-nums text-muted-text"
                        dir="ltr"
                      >
                        {record.score.toFixed(2)}
                      </span>
                    </div>
                  ) : (
                    <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-caption font-medium text-success">
                      جديد
                    </span>
                  )}
                  <Button
                    variant={added ? "outline" : "brand-ochre"}
                    size="sm"
                    disabled={full}
                    onClick={() => {
                      if (!added) {
                        onAdd(record.code, record.bacType);
                      }
                    }}
                    className="shrink-0"
                  >
                    {added ? "تمت الإضافة" : <><Plus className="size-3.5" /> أضف</>}
                  </Button>
                </div>
              );
            })}
            {hasMore && (
              <button
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="flex items-center justify-center gap-1.5 rounded-md py-2.5 text-caption font-medium text-muted-text transition-colors hover:bg-surface-soft hover:text-ink"
              >
                <ChevronDown className="size-3.5" />
                المزيد ({eligibleRecords.length - visibleCount} متبقية)
              </button>
            )}
          </div>
        )}

        <p className="text-caption text-muted-text">
          {choiceCount}/10 اختيارات
        </p>
      </DialogContent>
    </Dialog>
  );
}
