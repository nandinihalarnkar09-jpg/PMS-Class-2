"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, canManagePeople } from "@/lib/auth";
import { emailReviewEvent } from "@/lib/email";
import { fullName } from "@/lib/format";
import { weightedScore } from "@/lib/outcomes";

export async function ensureGoalRatings(reviewId: string) {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: { goalRatings: true },
  });
  if (!review) return;
  const goals = await prisma.goal.findMany({
    where: { employeeId: review.employeeId, cycleId: review.cycleId },
  });
  const have = new Set(review.goalRatings.map((r) => r.goalId));
  const missing = goals.filter((g) => !have.has(g.id));
  if (missing.length === 0) return;
  await prisma.goalRating.createMany({
    data: missing.map((g) => ({ reviewId, goalId: g.id })),
  });
}

function scoresFromForm(formData: FormData, prefix: "self" | "manager" | "final") {
  const rows = new Map<string, { score?: number; comment?: string }>();
  for (const [key, raw] of formData.entries()) {
    const value = String(raw);
    if (key.startsWith(`${prefix}Score_`)) {
      const id = key.slice(`${prefix}Score_`.length);
      const cur = rows.get(id) ?? {};
      cur.score = Number(value) || undefined;
      rows.set(id, cur);
    }
    if (key.startsWith(`${prefix}Comment_`)) {
      const id = key.slice(`${prefix}Comment_`.length);
      const cur = rows.get(id) ?? {};
      cur.comment = value;
      rows.set(id, cur);
    }
  }
  return rows;
}

export async function saveSelfReview(formData: FormData) {
  const ctx = await requireSession();
  if (!ctx?.user.employee) redirect("/sign-in");
  const id = String(formData.get("id") || "");
  await ensureGoalRatings(id);
  const review = await prisma.review.findUnique({
    where: { id },
    include: { employee: true, reviewer: { include: { user: true } }, goalRatings: { include: { goal: true } } },
  });
  if (!review || review.employeeId !== ctx.user.employee.id) return;
  const submit = String(formData.get("intent")) === "submit";
  const scores = scoresFromForm(formData, "self");
  await prisma.$transaction([
    prisma.review.update({
      where: { id },
      data: {
        selfSummary: String(formData.get("selfSummary") || ""),
        status: submit ? "SELF_SUBMITTED" : "SELF_IN_PROGRESS",
      },
    }),
    ...[...scores.entries()].map(([ratingId, row]) =>
      prisma.goalRating.update({
        where: { id: ratingId },
        data: {
          selfScore: row.score ?? null,
          selfComment: row.comment ?? "",
        },
      }),
    ),
  ]);
  if (submit && review.reviewer?.user.email) {
    await emailReviewEvent({
      toEmail: review.reviewer.user.email,
      toName: fullName(review.reviewer),
      subject: `${fullName(review.employee)} submitted a self-review`,
      body: "A self-review is waiting on you in Helix PMS.",
      reviewId: id,
    });
  }
  revalidatePath(`/reviews/${id}`);
  revalidatePath("/reviews");
}

export async function saveManagerReview(formData: FormData) {
  const ctx = await requireSession();
  if (!ctx?.user.employee) redirect("/sign-in");
  const id = String(formData.get("id") || "");
  await ensureGoalRatings(id);
  const review = await prisma.review.findUnique({
    where: { id },
    include: { employee: { include: { user: true } } },
  });
  if (!review) return;
  const allowed = review.reviewerId === ctx.user.employee.id || canManagePeople(ctx.user.role);
  if (!allowed) return;
  const submit = String(formData.get("intent")) === "submit";
  const scores = scoresFromForm(formData, "manager");
  await prisma.$transaction([
    prisma.review.update({
      where: { id },
      data: {
        managerSummary: String(formData.get("managerSummary") || ""),
        status: submit ? "MANAGER_SUBMITTED" : "MANAGER_IN_PROGRESS",
      },
    }),
    ...[...scores.entries()].map(([ratingId, row]) =>
      prisma.goalRating.update({
        where: { id: ratingId },
        data: {
          managerScore: row.score ?? null,
          managerComment: row.comment ?? "",
        },
      }),
    ),
  ]);
  if (submit) {
    const hr = await prisma.user.findMany({ where: { role: { in: ["HR", "ADMIN"] } }, take: 5 });
    await Promise.all(
      hr.map((u) =>
        emailReviewEvent({
          toEmail: u.email,
          toName: "People team",
          subject: `Ready for calibration: ${fullName(review.employee)}`,
          body: "A manager review was submitted and is ready for HR calibration.",
          reviewId: id,
        }),
      ),
    );
  }
  revalidatePath(`/reviews/${id}`);
  revalidatePath("/reviews");
}

export async function calibrateReview(formData: FormData) {
  const ctx = await requireSession();
  if (!ctx || !canManagePeople(ctx.user.role)) return;
  const id = String(formData.get("id") || "");
  await ensureGoalRatings(id);
  const scores = scoresFromForm(formData, "final");
  await prisma.$transaction(
    [...scores.entries()].map(([ratingId, row]) =>
      prisma.goalRating.update({
        where: { id: ratingId },
        data: { finalScore: row.score ?? null },
      }),
    ),
  );
  const withGoals = await prisma.goalRating.findMany({
    where: { reviewId: id },
    include: { goal: true },
  });
  const weighted = Number(formData.get("finalRating") || 0) || weightedScore(withGoals, "finalScore") || weightedScore(withGoals, "managerScore");
  const review = await prisma.review.update({
    where: { id },
    data: {
      finalRating: weighted,
      hrNotes: String(formData.get("hrNotes") || ""),
      status: "CALIBRATED",
    },
    include: { employee: { include: { user: true } } },
  });
  await emailReviewEvent({
    toEmail: review.employee.user.email,
    toName: fullName(review.employee),
    subject: "Your Helix appraisal has been calibrated",
    body: "HR has locked your final rating. Open the packet to read comments and acknowledge.",
    reviewId: id,
  });
  revalidatePath(`/reviews/${id}`);
  revalidatePath("/reports");
}

export async function acknowledgeReview(formData: FormData) {
  const ctx = await requireSession();
  if (!ctx?.user.employee) return;
  const id = String(formData.get("id") || "");
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review || review.employeeId !== ctx.user.employee.id) return;
  if (review.status !== "CALIBRATED") return;
  await prisma.review.update({ where: { id }, data: { status: "ACKNOWLEDGED" } });
  revalidatePath(`/reviews/${id}`);
}
