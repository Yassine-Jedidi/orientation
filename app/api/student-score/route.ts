import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { studentScore } from "@/db/schema";
import { auth } from "@/lib/auth";
import { calculateFg } from "@/lib/fg";
import { getBacTypeCode, getBacTypeLabel } from "@/lib/bac-types";

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const saved = await db.query.studentScore.findFirst({
    where: eq(studentScore.userId, userId),
  });

  return NextResponse.json({
    score: saved
      ? { ...saved, bacType: getBacTypeLabel(saved.bacType) ?? saved.bacType }
      : null,
  });
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

  const input = body as Record<string, unknown>;
  const bacType = typeof input.bacType === "string" ? input.bacType : "";
  const bacTypeCode = getBacTypeCode(bacType);
  const generalAverage = Number(input.generalAverage);
  const rawGrades = input.grades;

  if (!rawGrades || typeof rawGrades !== "object" || Array.isArray(rawGrades)) {
    return NextResponse.json({ error: "Invalid grades" }, { status: 400 });
  }

  const grades = Object.fromEntries(
    Object.entries(rawGrades).map(([code, value]) => [code, Number(value)]),
  );
  const result = calculateFg({ bacType, generalAverage, grades });

  if (!result || !bacTypeCode) {
    return NextResponse.json({ error: "Invalid score data" }, { status: 400 });
  }

  const [saved] = await db
    .insert(studentScore)
    .values({ userId, bacType: bacTypeCode, generalAverage, grades, ...result })
    .onConflictDoUpdate({
      target: studentScore.userId,
      set: {
        bacType: bacTypeCode,
        generalAverage,
        grades,
        ...result,
        updatedAt: new Date(),
      },
    })
    .returning();

  return NextResponse.json({ score: saved });
}
