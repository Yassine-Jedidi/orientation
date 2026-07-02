import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { studentProfile, studentScore, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { calculateFg } from "@/lib/fg";
import { getBacTypeCode, getBacTypeLabel } from "@/lib/bac-types";
import { TUNISIA_GOVERNORATES, type Governorate } from "@/lib/governorates";

function roundToTwo(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [saved, profile, account] = await Promise.all([
    db.query.studentScore.findFirst({
      where: eq(studentScore.userId, userId),
    }),
    db.query.studentProfile.findFirst({
      where: eq(studentProfile.userId, userId),
    }),
    db.query.user.findFirst({
      where: eq(user.id, userId),
      columns: { governorate: true },
    }),
  ]);

  return NextResponse.json({
    governorate: account?.governorate ?? null,
    bacType: profile
      ? getBacTypeLabel(profile.bacType) ?? profile.bacType
      : saved
        ? getBacTypeLabel(saved.bacType) ?? saved.bacType
        : null,
    score: saved
      ? { ...saved, bacType: getBacTypeLabel(saved.bacType) ?? saved.bacType }
      : null,
  });
}

export async function PATCH(request: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as
    | { bacType?: unknown; governorate?: unknown }
    | null;
  const bacTypeCode =
    typeof body?.bacType === "string" ? getBacTypeCode(body.bacType) : null;
  const governorate =
    typeof body?.governorate === "string" &&
    TUNISIA_GOVERNORATES.includes(body.governorate as Governorate)
      ? (body.governorate as Governorate)
      : null;

  if (!bacTypeCode && !governorate) {
    return NextResponse.json({ error: "Invalid profile data" }, { status: 400 });
  }

  await Promise.all([
    bacTypeCode
      ? db
          .insert(studentProfile)
          .values({ userId, bacType: bacTypeCode })
          .onConflictDoUpdate({
            target: studentProfile.userId,
            set: { bacType: bacTypeCode, updatedAt: new Date() },
          })
      : Promise.resolve(),
    governorate
      ? db
          .update(user)
          .set({ governorate, updatedAt: new Date() })
          .where(eq(user.id, userId))
      : Promise.resolve(),
  ]);

  return NextResponse.json({
    bacType: bacTypeCode ? body?.bacType : undefined,
    governorate: governorate ?? undefined,
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
  const generalAverage = roundToTwo(Number(input.generalAverage));
  const rawGrades = input.grades;

  if (!rawGrades || typeof rawGrades !== "object" || Array.isArray(rawGrades)) {
    return NextResponse.json({ error: "Invalid grades" }, { status: 400 });
  }

  const grades = Object.fromEntries(
    Object.entries(rawGrades).map(([code, value]) => [
      code,
      roundToTwo(Number(value)),
    ]),
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

  await db
    .insert(studentProfile)
    .values({ userId, bacType: bacTypeCode })
    .onConflictDoUpdate({
      target: studentProfile.userId,
      set: { bacType: bacTypeCode, updatedAt: new Date() },
    });

  return NextResponse.json({ score: saved });
}
