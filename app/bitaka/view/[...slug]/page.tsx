import type { ScoreRecord, ChoiceCardEntry } from "@/lib/types";
import { ChoiceCardItem } from "@/components/choice-card-item";
import { decodeShareData, decodeUserData, type ShareUserData } from "@/lib/share-encoding";
import { readScores } from "@/lib/score-data";
import { getBaseScore, getRowStatus } from "@/lib/choice-eligibility";
import type { Gender } from "@/lib/gender";
import { isGeographicBonusApplicableForRecord } from "@/lib/geographic-bonus";

interface Props {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function BitakaViewSlugPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const records = readScores();

  let userData: ShareUserData | null = null;
  if (typeof sp.d === "string") {
    userData = decodeUserData(sp.d);
  }

  const userScore = userData?.s ?? null;
  const userGovernorate = userData?.g ?? null;
  const userGrades = userData?.d ?? null;
  const userGender = (userData?.n as Gender) ?? null;
  const userBacType = null; // Will be inferred from the entry

  let entries: ChoiceCardEntry[] = [];
  let parseError = false;

  if (slug && slug.length === 1) {
    const decoded = decodeShareData(slug[0]);
    if (decoded) {
      const decodedEntries = decoded.entries ?? decoded.codes.map((code) => ({
        code,
        bacType: decoded.bacType,
      }));
      entries = decodedEntries.map((entry, i) => ({
        code: entry.code,
        bacType: entry.bacType,
        rank: i + 1,
      }));
    } else {
      parseError = true;
    }
  } else {
    parseError = true;
  }

  const choiceRecords = entries
    .map((entry) => {
      const record = records.find(
        (r) => r.code === entry.code && r.bacType === entry.bacType,
      );
      return { entry, record };
    })
    .filter((item): item is { entry: ChoiceCardEntry; record: ScoreRecord } => item.record !== undefined)
    .sort((a, b) => a.entry.rank - b.entry.rank);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">

      {parseError ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-body text-muted-text">
            رابط غير صالح
          </p>
        </div>
      ) : choiceRecords.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-body text-muted-text">
            {entries.length === 0
              ? "لا توجد برامج في هذه البطاقة"
              : "بعض البرامج غير متوفرة حالياً"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {choiceRecords.map(({ entry, record }) => {
            const effective = getBaseScore(record.formula, userScore, userGrades);
            const entryBacType = entry.bacType;
            const status = userScore !== null
              ? getRowStatus({
                  record,
                  userScore,
                  userBacType: entryBacType,
                  userGrades,
                  userGovernorate,
                  userGender,
                  records,
                  useGeographicBonus: true,
                })
              : null;
            const geoBonusApplicable = isGeographicBonusApplicableForRecord(
              record,
              userGovernorate,
              records,
              true,
            );
            return (
              <ChoiceCardItem
                key={`${entry.code}|${entry.bacType}`}
                entry={entry}
                record={record}
                status={status}
                effective={effective}
                userBacType={entryBacType}
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
      )}
    </div>
  );
}
