"use client";

import { useMemo, useState } from "react";
import { Search, Plus, ChevronDown } from "lucide-react";
import type { ScoreRecord } from "@/lib/types";
import { isGenderEligible, isGender, type Gender } from "@/lib/gender";
import { getBacOptionalSubjects } from "@/lib/bac-subjects";
import { hasGeographicBonus, isSameGeographicBonusZone } from "@/lib/geographic-bonus";

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

interface ChoiceCardAddDialogProps {
  records: ScoreRecord[];
  userBacType: string | null;
  userGender: Gender | null;
  userGovernorate: string | null;
  userGrades: Record<string, number> | null;
  isInCard: (code: string, bacType: string) => boolean;
  onAdd: (code: string, bacType: string) => void;
  choiceCount: number;
}

export function ChoiceCardAddDialog({
  records,
  userBacType,
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
      .filter((r, i, arr) => arr.findIndex((x) => x.code === r.code) === i)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }, [records, userBacType, userGender, userGrades, query]);

  const visibleRecords = eligibleRecords.slice(0, visibleCount);
  const hasMore = visibleCount < eligibleRecords.length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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

        {!userBacType ? (
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
                      {hasGeographicBonus(record) &&
                        userGovernorate &&
                        isSameGeographicBonusZone(
                          userGovernorate,
                          record.governorate,
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
