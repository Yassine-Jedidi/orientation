import fs from "node:fs";
import path from "node:path";
import type { ScoreRecord, ChoiceCardEntry } from "@/lib/types";
import { ChoiceCardItem } from "@/components/choice-card-item";
import { decodeShareData } from "@/lib/share-encoding";

function readScores(): ScoreRecord[] {
  const source = fs.readFileSync(
    path.join(process.cwd(), "public", "data", "scores.json"),
    "utf8",
  );
  return JSON.parse(source) as ScoreRecord[];
}

interface Props {
  params: Promise<{ slug?: string[] }>;
}

export default async function BitakaViewSlugPage({ params }: Props) {
  const { slug } = await params;
  const records = readScores();

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
          {choiceRecords.map(({ entry, record }) => (
            <ChoiceCardItem
              key={`${entry.code}|${entry.bacType}`}
              entry={entry}
              record={record}
              status={null}
              effective={null}
              userBacType={null}
              userGovernorate={null}
              userScore={null}
              userGrades={null}
              isFavorite={false}
              isReadonly
            />
          ))}
        </div>
      )}
    </div>
  );
}
