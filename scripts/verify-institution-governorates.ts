import scores from "../public/data/scores.json";
import {
  INSTITUTION_GOVERNORATES,
  TUNISIA_GOVERNORATES,
  type Governorate,
} from "../lib/governorates";

const institutions = [...new Set(scores.map((record) => record.institution))];
const mappedInstitutions = Object.keys(INSTITUTION_GOVERNORATES);
const missing = institutions.filter(
  (institution) => !(institution in INSTITUTION_GOVERNORATES),
);
const stale = mappedInstitutions.filter(
  (institution) => !institutions.includes(institution),
);

if (missing.length || stale.length) {
  throw new Error(
    JSON.stringify({ missing, stale }, null, 2),
  );
}

for (const governorate of TUNISIA_GOVERNORATES) {
  const allowed = new Set(
    institutions.filter(
      (institution) =>
        INSTITUTION_GOVERNORATES[
          institution as keyof typeof INSTITUTION_GOVERNORATES
        ] === governorate,
    ),
  );
  const filteredRows = scores.filter(
    (record) =>
      INSTITUTION_GOVERNORATES[
        record.institution as keyof typeof INSTITUTION_GOVERNORATES
      ] === governorate,
  );
  const leaked = filteredRows.filter((record) => !allowed.has(record.institution));

  if (leaked.length) {
    throw new Error(`Governorate filter leaked rows for ${governorate}`);
  }
}

const counts = Object.values(INSTITUTION_GOVERNORATES).reduce(
  (result, governorate) => {
    result[governorate] = (result[governorate] ?? 0) + 1;
    return result;
  },
  {} as Partial<Record<Governorate, number>>,
);

console.log(
  `Verified ${scores.length} rows, ${institutions.length} institutions, and ${TUNISIA_GOVERNORATES.length} governorate filters.`,
);
console.log(counts);
