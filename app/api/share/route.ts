import { NextResponse } from "next/server";
import { db } from "@/db";
import { shareLink } from "@/db/schema";
import { nanoid } from "nanoid";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>).payload
      : undefined;
  if (typeof payload !== "string" || payload.length === 0) {
    return NextResponse.json({ error: "payload is required" }, { status: 400 });
  }

  const id = nanoid(10);

  await db.insert(shareLink).values({ id, payload }).onConflictDoNothing();

  return NextResponse.json({ id });
}
