import { FavoritesClient } from "./favorites-client";
import { readScores } from "@/lib/score-data";

export default function FavoritesPage() {
  return <FavoritesClient initialData={readScores()} />;
}
