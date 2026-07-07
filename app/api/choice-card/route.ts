import { and, asc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { choiceCard } from "@/db/schema";
import { auth } from "@/lib/auth";
import type { ChoiceCardEntry } from "@/lib/types";

function normalizeChoices(entries: ChoiceCardEntry[]): ChoiceCardEntry[] {
  return entries
    .filter(
      (entry, index, array) =>
        array.findIndex(
          (item) => item.code === entry.code && item.bacType === entry.bacType,
        ) === index,
    )
    .sort((a, b) => a.rank - b.rank)
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

  // Check count
  const count = await db.$count(choiceCard, eq(choiceCard.userId, userId));
  if (count >= 10) {
    return NextResponse.json({ error: "Maximum 10 choices allowed" }, { status: 400 });
  }

  const nextRank = count + 1;

  await db
    .insert(choiceCard)
    .values({ userId, code, bacType, rank: nextRank })
    .onConflictDoNothing();

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

  // Replace all entries for this user
  await db.transaction(async (tx) => {
    await tx.delete(choiceCard).where(eq(choiceCard.userId, userId));
    if (entries.length > 0) {
      await tx.insert(choiceCard).values(
        entries.map((e) => ({ userId, code: e.code, bacType: e.bacType, rank: e.rank })),
      );
    }
  });

  const merged = await db.query.choiceCard.findMany({
    where: eq(choiceCard.userId, userId),
    orderBy: asc(choiceCard.rank),
    columns: { code: true, bacType: true, rank: true },
  });

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

  // Delete and re-index ranks
  await db.transaction(async (tx) => {
    await tx
      .delete(choiceCard)
      .where(
        and(
          eq(choiceCard.userId, userId),
          eq(choiceCard.code, code),
          eq(choiceCard.bacType, bacType),
        ),
      );

    // Re-index remaining entries
    const remaining = await tx
      .select({ id: choiceCard.id, rank: choiceCard.rank })
      .from(choiceCard)
      .where(eq(choiceCard.userId, userId))
      .orderBy(asc(choiceCard.rank));

    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].rank !== i + 1) {
        await tx
          .update(choiceCard)
          .set({ rank: i + 1, updatedAt: new Date() })
          .where(eq(choiceCard.id, remaining[i].id));
      }
    }
  });

  return NextResponse.json({ success: true });
}
