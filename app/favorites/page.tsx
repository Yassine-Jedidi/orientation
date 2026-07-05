import fs from "node:fs";
import path from "node:path";
import { FavoritesClient } from "./favorites-client";
import type { ScoreRecord } from "@/lib/types";

function readScores(): ScoreRecord[] {
  const source = fs.readFileSync(
    path.join(process.cwd(), "public", "data", "scores.json"),
    "utf8",
  );
  return JSON.parse(source) as ScoreRecord[];
}

export default function FavoritesPage() {
  return <FavoritesClient initialData={readScores()} />;
}
