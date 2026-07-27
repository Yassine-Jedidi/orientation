import type { ScoreRecord, ChoiceCardEntry } from "@/lib/types";
import { ChoiceCardItem } from "@/components/choice-card-item";
import { decodeShareViewData } from "@/lib/share-encoding";
import { readScores } from "@/lib/score-data";
import { getBaseScore, getRowStatus } from "@/lib/choice-eligibility";
import { isGeographicBonusApplicableForRecord } from "@/lib/geographic-bonus";
import { BittakaClient } from "./bittaka-client";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function BittakaPage({ searchParams }: Props) {
  const sp = await searchParams;

  // Shared view mode
  if (typeof sp.v === "string") {
    const data = decodeShareViewData(sp.v);
    if (!data) {
      return (
        <div className="mx-auto w-full max-w-4xl px-6 py-8">
          <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border py-16 text-center">
            <p className="text-body text-muted-text">رابط غير صالح</p>
          </div>
        </div>
      );
    }

    const records = readScores();
    const userScore = data.userScore ?? null;
    const userGovernorate = data.userGovernorate ?? null;
    const userGrades = data.userGrades ?? null;
    const userGender = data.userGender ?? null;

    const choiceRecords = data.entries
      .map((entry, i) => {
        const record = records.find(
          (r) => r.code === entry.code && r.bacType === entry.bacType,
        );
        return record ? { entry: { ...entry, rank: i + 1 }, record } : null;
      })
      .filter(<T,>(item: T | null): item is T => item !== null);

    if (choiceRecords.length === 0) {
      return (
        <div className="mx-auto w-full max-w-4xl px-6 py-8">
          <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border py-16 text-center">
            <p className="text-body text-muted-text">بعض البرامج غير متوفرة حالياً</p>
          </div>
        </div>
      );
    }

    return (
      <div className="mx-auto w-full max-w-4xl px-6 py-8">
        <div className="mb-2 text-xs text-muted-text">بطاقة الاختيارات — تمت مشاركتها معك</div>
        <div className="flex flex-col gap-2">
          {choiceRecords.map(({ entry, record }) => {
            const effective = getBaseScore(record.formula, userScore, userGrades);
            const status = userScore !== null
              ? getRowStatus({ record, userScore, userBacType: entry.bacType, userGrades, userGovernorate, userGender, records, useGeographicBonus: true })
              : null;
            const geoBonusApplicable = isGeographicBonusApplicableForRecord(record, userGovernorate, records, true);
            return (
              <ChoiceCardItem
                key={`${entry.code}|${entry.bacType}`}
                entry={entry}
                record={record}
                status={status}
                effective={effective}
                userBacType={entry.bacType}
                userGovernorate={userGovernorate}
                userScore={userScore}
                userGrades={userGrades}
                geoBonusApplicable={geoBonusApplicable}
                isFavorite={false}
                isReadonly
              />
            );
          })}
        </div>
      </div>
    );
  }

  // Normal mode
  return <BittakaClient />;
}
