import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import type { ScoreRecord } from "@/lib/types";

export const readScores = cache((): ScoreRecord[] => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "public", "data", "scores.json"),
    "utf8",
  );
  return JSON.parse(source) as ScoreRecord[];
});
