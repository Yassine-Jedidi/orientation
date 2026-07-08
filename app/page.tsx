import { HomeClient } from "./home-client";
import { readScores } from "@/lib/score-data";

export default function Home() {
  return <HomeClient initialData={readScores()} />;
}
