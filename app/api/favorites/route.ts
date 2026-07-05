import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { favorite } from "@/db/schema";
import { auth } from "@/lib/auth";

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db.query.favorite.findMany({
    where: eq(favorite.userId, userId),
    columns: { code: true, bacType: true },
  });

  return NextResponse.json({ favorites: rows.map((r) => `${r.code}|${r.bacType}`) });
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

  await db
    .insert(favorite)
    .values({ userId, code, bacType })
    .onConflictDoNothing();

  return NextResponse.json({ success: true });
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

  const values = body && typeof body === "object"
    ? (body as { favorites?: unknown }).favorites
    : undefined;
  if (!Array.isArray(values) || !values.every((value) => typeof value === "string")) {
    return NextResponse.json({ error: "favorites must be a string array" }, { status: 400 });
  }

  const rows = values.flatMap((value) => {
    const separator = value.lastIndexOf("|");
    if (separator <= 0 || separator === value.length - 1) return [];
    return [{ userId, code: value.slice(0, separator), bacType: value.slice(separator + 1) }];
  });
  if (rows.length) {
    await db.insert(favorite).values(rows).onConflictDoNothing();
  }

  const merged = await db.query.favorite.findMany({
    where: eq(favorite.userId, userId),
    columns: { code: true, bacType: true },
  });
  return NextResponse.json({ favorites: merged.map((row) => `${row.code}|${row.bacType}`) });
}

export async function DELETE(request: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!request.headers.get("content-type")) {
    await db.delete(favorite).where(eq(favorite.userId, userId));
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
    .delete(favorite)
    .where(
      and(
        eq(favorite.userId, userId),
        eq(favorite.code, code),
        eq(favorite.bacType, bacType),
      ),
    );

  return NextResponse.json({ success: true });
}
