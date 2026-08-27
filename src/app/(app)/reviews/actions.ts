"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAccess, assertCanWriteManagerReview, assertHrAdmin } from "@/lib/auth";
import { emailReviewEvent } from "@/lib/email";
import { fullName } from "@/lib/format";
import { weightedScore } from "@/lib/outcomes";
import { ensureGoalRatings } from "@/lib/review-ratings";
import { ROLES } from "@/lib/access";

function scoresFromForm(formData: FormData, prefix: "self" | "manager" | "final", allowedIds: Set<string>) {
  const rows = new Map<string, { score?: number; comment?: string }>();
  for (const [key, raw] of formData.entries()) {
    const value = String(raw);
    if (key.startsWith(`${prefix}Score_`)) {
      const id = key.slice(`${prefix}Score_`.length);
      if (!allowedIds.has(id)) continue;
      const cur = rows.get(id) ?? {};
      cur.score = Number(value) || undefined;
      rows.set(id, cur);
    }
    if (key.startsWith(`${prefix}Comment_`)) {
      const id = key.slice(`${prefix}Comment_`.length);
      if (!allowedIds.has(id)) continue;
      const cur = rows.get(id) ?? {};
      cur.comment = value;
      rows.set(id, cur);
    }
  }
  return rows;
}

export async function saveSelfReview(formData: FormData) {
  const access = await requireAccess();
  const id = String(formData.get("id") || "");
  const review = await prisma.review.findUnique({
    where: { id },
    include: { employee: true, reviewer: { include: { user: true } }, goalRatings: true },
  });
  if (!review) notFound();
  if (review.employeeId !== access.selfId) notFound();
  await ensureGoalRatings(id);
  const ratingRows = await prisma.goalRating.findMany({ where: { reviewId: id }, select: { id: true } });
  const allowedIds = new Set(ratingRows.map((r) => r.id));
  const submit = String(formData.get("intent")) === "submit";
  const scores = scoresFromForm(formData, "self", allowedIds);
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
  const access = await requireAccess();
  const id = String(formData.get("id") || "");
  const review = await prisma.review.findUnique({
    where: { id },
    include: { employee: { include: { user: true } }, goalRatings: true },
  });
  if (!review) notFound();
  assertCanWriteManagerReview(access, review);
  await ensureGoalRatings(id);
  const ratingRows = await prisma.goalRating.findMany({ where: { reviewId: id }, select: { id: true } });
  const allowedIds = new Set(ratingRows.map((r) => r.id));
  const submit = String(formData.get("intent")) === "submit";
  const scores = scoresFromForm(formData, "manager", allowedIds);
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
    const hr = await prisma.user.findMany({ where: { role: ROLES.hr_admin }, take: 5 });
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
  const access = await requireAccess();
  assertHrAdmin(access);
  const id = String(formData.get("id") || "");
  const review = await prisma.review.findUnique({
    where: { id },
    include: { goalRatings: true },
  });
  if (!review) notFound();
  await ensureGoalRatings(id);
  const ratingRows = await prisma.goalRating.findMany({ where: { reviewId: id }, select: { id: true } });
  const allowedIds = new Set(ratingRows.map((r) => r.id));
  const scores = scoresFromForm(formData, "final", allowedIds);
  if (scores.size > 0) {
    await prisma.$transaction(
      [...scores.entries()].map(([ratingId, row]) =>
        prisma.goalRating.update({
          where: { id: ratingId },
          data: { finalScore: row.score ?? null },
        }),
      ),
    );
  }
  const withGoals = await prisma.goalRating.findMany({
    where: { reviewId: id },
    include: { goal: true },
  });
  const weighted =
    Number(formData.get("finalRating") || 0) ||
    weightedScore(withGoals, "finalScore") ||
    weightedScore(withGoals, "managerScore");
  const updated = await prisma.review.update({
    where: { id },
    data: {
      finalRating: weighted,
      hrNotes: String(formData.get("hrNotes") || ""),
      status: "CALIBRATED",
    },
    include: { employee: { include: { user: true } } },
  });
  await emailReviewEvent({
    toEmail: updated.employee.user.email,
    toName: fullName(updated.employee),
    subject: "Your Helix appraisal has been calibrated",
    body: "HR has locked your final rating. Open the packet to read comments and acknowledge.",
    reviewId: id,
  });
  revalidatePath(`/reviews/${id}`);
  revalidatePath("/reports");
}

export async function acknowledgeReview(formData: FormData) {
  const access = await requireAccess();
  const id = String(formData.get("id") || "");
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review || review.employeeId !== access.selfId) notFound();
  if (review.status !== "CALIBRATED") return;
  await prisma.review.update({ where: { id }, data: { status: "ACKNOWLEDGED" } });
  revalidatePath(`/reviews/${id}`);
}
