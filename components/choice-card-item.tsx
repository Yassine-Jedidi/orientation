"use client";

import { GripVertical, Heart, X } from "lucide-react";
import type { ChoiceCardEntry, ScoreRecord } from "@/lib/types";
import { cn } from "@/lib/utils";
import { forwardRef, useMemo, useState, type ComponentProps } from "react";
import { hasGeographicBonus, isSameGeographicBonusZone, isGeographicBonusApplicable, getScoreWithGeographicBonus } from "@/lib/geographic-bonus";
import { getFormulaCalculation } from "@/lib/formula-evaluator";
import type { RowStatus } from "@/lib/choice-eligibility";
import {
  Tooltip,
  TooltipTrigger,
  TooltipPopup,
  TooltipPositioner,
  TooltipPortal,
} from "@/components/ui/tooltip";

interface ChoiceCardItemProps extends ComponentProps<"div"> {
  entry: ChoiceCardEntry;
  record: ScoreRecord;
  status: RowStatus;
  effective: number | null;
  userBacType: string | null;
  userGovernorate: string | null;
  userScore: number | null;
  userGrades: Record<string, number> | null;
  geoBonusApplicable?: boolean;
  isFavorite: boolean;
  onToggleFavorite?: (code: string, bacType: string) => void;
  onRemove?: (code: string, bacType: string) => void;
  isReadonly?: boolean;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  qualified: { label: "مؤهل", className: "bg-success/10 text-success border-success/30" },
  close: { label: "قريب", className: "bg-warning/10 text-warning border-warning/30" },
  far: { label: "بعيد", className: "bg-error/10 text-error border-error/30" },
  unavailable: { label: "غير متاح", className: "bg-surface-strong text-muted-text border-border" },
  "gender-unavailable": { label: "غير متاح", className: "bg-surface-strong text-muted-text border-border" },
};

function getStatusConfig(status: RowStatus) {
  if (!status) return null;
  return STATUS_CONFIG[status] ?? null;
}

const ChoiceCardItem = forwardRef<HTMLDivElement, ChoiceCardItemProps>(
  (
    {
      entry,
      record,
      status,
      effective,
      userBacType,
      userGovernorate,
      userScore,
      userGrades,
      geoBonusApplicable,
      isFavorite,
      onToggleFavorite = () => {},
      onRemove = () => {},
      isReadonly = false,
      dragHandleProps,
      isDragging,
      className,
      ...props
    },
    ref,
  ) => {
    const statusConfig = getStatusConfig(status);

    const calcDisplay = useMemo(() => {
      if (userScore === null) return null;
      if (!record.formula || record.formula === "FG") {
        return { label: "FG", substituted: userScore.toFixed(2), result: userScore };
      }
      const calc = getFormulaCalculation(record.formula, {
        FG: userScore,
        ...(userGrades ?? {}),
      });
      return calc ? { label: record.formula, ...calc } : null;
    }, [record.formula, userScore, userGrades]);

    const effectiveGeoBonusApplicable = geoBonusApplicable ?? (
      userScore !== null &&
      Boolean(userGovernorate) &&
      isGeographicBonusApplicable(record, userGovernorate, record.governorate, true)
    );
    const effectiveWithGeo = effectiveGeoBonusApplicable && effective !== null
      ? getScoreWithGeographicBonus(effective, record, true)
      : null;
    const finalEffective = effectiveWithGeo ?? effective;
    const finalDiff = finalEffective !== null && record.score !== null
      ? finalEffective - record.score
      : null;
    const scoreDiff = finalDiff;

    const [tooltipOpen, setTooltipOpen] = useState(false);

    return (
      <div
        ref={ref}
        className={cn(
          "group flex w-full items-center gap-3 rounded-lg border bg-surface-card px-4 py-3 transition-shadow",
          isDragging && "shadow-lg ring-2 ring-brand-ochre/30",
          className,
        )}
        {...props}
      >
        {/* Rank badge */}
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums",
            entry.rank <= 3
              ? "bg-brand-ochre/50 text-ink"
              : "bg-surface-strong text-muted-text",
          )}
        >
          {entry.rank}
        </div>

        {/* Drag handle */}
        <div
          {...dragHandleProps}
          className="flex shrink-0 cursor-grab touch-none items-center text-muted-soft active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="break-words text-sm font-medium text-ink">
              {record.license}
            </span>
            <span className="shrink-0 font-mono text-xs text-muted-text">
              {record.code}
            </span>
          </div>
          {record.speciality && record.speciality.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {record.speciality.map((speciality) => (
                <span
                  key={speciality}
                  className="w-fit whitespace-normal rounded-full bg-brand-peach/60 px-1.5 py-0.5 text-xs leading-5 text-ink"
                >
                  {speciality}
                </span>
              ))}
            </div>
          )}
          <span className="block break-words text-xs text-muted-text">
            {record.institution}
          </span>
        </div>

        {/* Score */}
        {record.score !== null && (
          <div className="shrink-0 text-right">
            <div className="flex items-center justify-end gap-1.5">
              {hasGeographicBonus(record) &&
                (geoBonusApplicable ??
                  (userGovernorate &&
                    isSameGeographicBonusZone(
                      userGovernorate,
                      record.governorate,
                    ))) && (
                  <span className="rounded-full bg-brand-mint/60 px-1.5 py-0.5 text-caption font-semibold text-ink">
                    +7%
                  </span>
                )}
              <div className="flex flex-col items-end">
                <Tooltip open={tooltipOpen} onOpenChange={setTooltipOpen}>
                  <TooltipTrigger
                    onClick={() => setTooltipOpen((o) => !o)}
                    onBlur={() => setTooltipOpen(false)}
                  >
                    <div className="cursor-help font-mono text-sm tabular-nums text-ink" dir="ltr">
                      {record.score.toFixed(2)}
                    </div>
                  </TooltipTrigger>
                  <TooltipPortal>
                    <TooltipPositioner>
                      <TooltipPopup className="max-w-72 text-right">
                        <div className="flex flex-col gap-1.5 font-mono text-xs" dir="ltr">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-text">سكور البرنامج</span>
                            <span className="text-ink">{record.score.toFixed(2)}</span>
                          </div>
                          {calcDisplay ? (
                            <div className="flex flex-col gap-0.5 border-t border-border pt-1.5">
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-text">سكورك</span>
                                <span className="text-ink">{calcDisplay.result.toFixed(2)}</span>
                              </div>
                              <span className="text-muted-soft">{calcDisplay.label} = {calcDisplay.substituted}</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-4 border-t border-border pt-1.5">
                              <span className="text-muted-text">سكورك</span>
                              <span className="text-muted-soft">—</span>
                            </div>
                          )}
                          {effectiveGeoBonusApplicable && effectiveWithGeo !== null && (
                            <div className="flex items-center justify-between gap-4 border-t border-border pt-1.5">
                              <span className="text-muted-text">بعد التنفيل (+7%)</span>
                              <span className="text-ink">{effectiveWithGeo.toFixed(2)}</span>
                            </div>
                          )}
                          {finalDiff !== null && (
                            <div className={cn(
                              "flex items-center justify-between gap-4 border-t border-border pt-1.5 font-bold",
                              finalDiff >= 0 ? "text-success" : "text-error",
                            )}>
                              <span>الفرق</span>
                              <span>{(finalDiff >= 0 ? "+" : "")}{finalDiff.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      </TooltipPopup>
                    </TooltipPositioner>
                  </TooltipPortal>
                </Tooltip>
                {scoreDiff !== null && (
                  <div
                    className={cn(
                      "font-mono text-xs tabular-nums",
                      scoreDiff >= 0 ? "text-success" : "text-error",
                    )}
                    dir="ltr"
                  >
                    {scoreDiff >= 0 ? "+" : ""}
                    {scoreDiff.toFixed(2)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Status badge (desktop only) */}
        {statusConfig && (
          <div
            className={cn(
              "hidden shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium leading-5 sm:block",
              statusConfig.className,
            )}
          >
            {statusConfig.label}
          </div>
        )}
        {statusConfig === null && record.score === null && (
          <div className="hidden shrink-0 rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-xs font-medium leading-5 text-success sm:block">
            جديدة
          </div>
        )}

        {/* Actions */}
        {!isReadonly && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => onToggleFavorite?.(record.code, record.bacType)}
              className="hidden size-7 items-center justify-center rounded-md text-muted-soft transition-colors hover:bg-surface-strong hover:text-brand-pink sm:flex"
              aria-label={isFavorite ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
            >
              <Heart
                className="size-4"
                {...(isFavorite ? { fill: "currentColor" } : {})}
              />
            </button>
            <button
              type="button"
              onClick={() => onRemove?.(entry.code, entry.bacType)}
              className="flex size-7 items-center justify-center rounded-md text-muted-soft opacity-100 transition-all hover:bg-surface-strong hover:text-error sm:opacity-0 sm:group-hover:opacity-100"
              aria-label="إزالة من البطاقة"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
      </div>
    );
  },
);

ChoiceCardItem.displayName = "ChoiceCardItem";

export { ChoiceCardItem };
export type { ChoiceCardItemProps };
