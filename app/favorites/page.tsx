import fs from "node:fs";
import path from "node:path";
import { FavoritesClient } from "./favorites-client";
import type { ScoreRecord } from "@/lib/types";
import { getInstitutionGovernorate } from "@/lib/governorates";

function readScores(): ScoreRecord[] {
  const source = fs.readFileSync(
    path.join(process.cwd(), "public", "data", "scores.json"),
    "utf8",
  );
  const records = JSON.parse(source) as Omit<ScoreRecord, "governorate">[];
  return records.map((record) => ({
    ...record,
    governorate: getInstitutionGovernorate(record.institution),
  }));
}

export default function FavoritesPage() {
  return <FavoritesClient initialData={readScores()} />;
}
