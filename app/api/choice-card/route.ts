import { and, asc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db, neonSql } from "@/db";
import { choiceCard } from "@/db/schema";
import { auth } from "@/lib/auth";
import type { ChoiceCardEntry } from "@/lib/types";

function normalizeChoices(entries: ChoiceCardEntry[]): ChoiceCardEntry[] {
  return entries
    .sort((a, b) => a.rank - b.rank)
    .filter(
      (entry, index, array) =>
        array.findIndex(
          (item) => item.code === entry.code && item.bacType === entry.bacType,
        ) === index,
    )
    .slice(0, 10)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db.query.choiceCard.findMany({
    where: eq(choiceCard.userId, userId),
    orderBy: asc(choiceCard.rank),
    columns: { code: true, bacType: true, rank: true },
  });

  return NextResponse.json({ choices: rows });
}

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { code, bacType } = body as Record<string, unknown>;
  if (typeof code !== "string" || typeof bacType !== "string") {
    return NextResponse.json({ error: "code and bacType are required" }, { status: 400 });
  }

  const existing = await db.query.choiceCard.findFirst({
    where: and(
      eq(choiceCard.userId, userId),
      eq(choiceCard.code, code),
      eq(choiceCard.bacType, bacType),
    ),
    columns: { rank: true },
  });
  if (existing) {
    return NextResponse.json({ success: false, rank: existing.rank }, { status: 409 });
  }

  const rows = await db
    .select({ rank: choiceCard.rank })
    .from(choiceCard)
    .where(eq(choiceCard.userId, userId))
    .orderBy(asc(choiceCard.rank));
  if (rows.length >= 10) {
    return NextResponse.json({ error: "Maximum 10 choices allowed" }, { status: 400 });
  }

  const nextRank = rows.length + 1;

  const inserted = await db
    .insert(choiceCard)
    .values({ userId, code, bacType, rank: nextRank })
    .onConflictDoNothing()
    .returning({ rank: choiceCard.rank });

  if (inserted.length === 0) {
    const conflict = await db.query.choiceCard.findFirst({
      where: and(
        eq(choiceCard.userId, userId),
        eq(choiceCard.code, code),
        eq(choiceCard.bacType, bacType),
      ),
      columns: { rank: true },
    });
    return NextResponse.json(
      { success: false, rank: conflict?.rank ?? nextRank },
      { status: 409 },
    );
  }

  return NextResponse.json({ success: true, rank: nextRank });
}

export async function PUT(request: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const values = (body as { choices?: unknown }).choices;
  if (!Array.isArray(values)) {
    return NextResponse.json({ error: "choices must be an array" }, { status: 400 });
  }

  const entries = normalizeChoices(values.filter(
    (item): item is ChoiceCardEntry =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as ChoiceCardEntry).code === "string" &&
      typeof (item as ChoiceCardEntry).bacType === "string" &&
      typeof (item as ChoiceCardEntry).rank === "number",
  ));

  if (entries.length > 10) {
    return NextResponse.json({ error: "Maximum 10 choices allowed" }, { status: 400 });
  }

  if (entries.length === 0) {
    await db.delete(choiceCard).where(eq(choiceCard.userId, userId));
    return NextResponse.json({ choices: [] });
  }

  const targetKeys = new Set(entries.map((entry) => `${entry.code}|${entry.bacType}`));
  const existingRows = await db.query.choiceCard.findMany({
    where: eq(choiceCard.userId, userId),
    columns: { id: true, code: true, bacType: true },
  });
  const staleRows = existingRows.filter(
    (row) => !targetKeys.has(`${row.code}|${row.bacType}`),
  );

  const queries = [
    neonSql`
      UPDATE choice_card
      SET rank = -rank - 100, updated_at = now()
      WHERE user_id = ${userId}
    `,
    ...staleRows.map((row) => neonSql`
      DELETE FROM choice_card
      WHERE id = ${row.id}
    `),
    ...entries.map((entry) => neonSql`
      INSERT INTO choice_card (user_id, code, bac_type, rank, created_at, updated_at)
      VALUES (${userId}, ${entry.code}, ${entry.bacType}, ${entry.rank}, now(), now())
      ON CONFLICT (user_id, code, bac_type)
      DO UPDATE SET rank = excluded.rank, updated_at = now()
    `),
    neonSql`
      SELECT code, bac_type AS "bacType", rank
      FROM choice_card
      WHERE user_id = ${userId}
      ORDER BY rank ASC
    `,
  ];

  const results = await neonSql.transaction(queries);
  const merged = results.at(-1) ?? [];

  return NextResponse.json({ choices: merged });
}

export async function DELETE(request: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!request.headers.get("content-type")) {
    await db.delete(choiceCard).where(eq(choiceCard.userId, userId));
    return NextResponse.json({ success: true });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { code, bacType } = body as Record<string, unknown>;
  if (typeof code !== "string" || typeof bacType !== "string") {
    return NextResponse.json({ error: "code and bacType are required" }, { status: 400 });
  }

  await db
    .delete(choiceCard)
    .where(
      and(
        eq(choiceCard.userId, userId),
        eq(choiceCard.code, code),
        eq(choiceCard.bacType, bacType),
      ),
    );

  const remaining = await db
    .select({ id: choiceCard.id, rank: choiceCard.rank })
    .from(choiceCard)
    .where(eq(choiceCard.userId, userId))
    .orderBy(asc(choiceCard.rank));

  for (let i = 0; i < remaining.length; i++) {
    if (remaining[i].rank !== i + 1) {
      await db
        .update(choiceCard)
        .set({ rank: i + 1, updatedAt: new Date() })
        .where(eq(choiceCard.id, remaining[i].id));
    }
  }

  return NextResponse.json({ success: true });
}
