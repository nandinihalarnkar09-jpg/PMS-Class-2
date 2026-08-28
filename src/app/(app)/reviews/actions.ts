"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAccess, assertCanWriteManagerReview, assertHrAdmin } from "@/lib/auth";
import { emailReviewEvent } from "@/lib/email";
import { fullName } from "@/lib/format";
import { weightedScore } from "@/lib/outcomes";
import { ensureGoalRatings } from "@/lib/review-ratings";
import { ROLES } from "@/lib/access";
import { GOAL_STATES, REVIEW_STATES, canTransitionReview } from "@/lib/workflow";

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

async function allowedRatingIds(reviewId: string) {
  await ensureGoalRatings(reviewId);
  const ratingRows = await prisma.goalRating.findMany({ where: { reviewId }, select: { id: true } });
  return new Set(ratingRows.map((r) => r.id));
}

export async function saveSelfReview(formData: FormData) {
  const access = await requireAccess();
  const id = String(formData.get("id") || "");
  const review = await prisma.review.findUnique({
    where: { id },
    include: { employee: true, reviewer: { include: { user: true } }, cycle: true },
  });
  if (!review) notFound();
  if (review.employeeId !== access.selfId) notFound();
  if (review.status !== REVIEW_STATES.not_started) notFound();
  const allowedIds = await allowedRatingIds(id);
  const submit = String(formData.get("intent")) === "submit";
  const goals = await prisma.goal.findMany({ where: { employeeId: review.employeeId, cycleId: review.cycleId } });
  const plansReady = goals.length === 0 || goals.every((g) => g.status === GOAL_STATES.approved);
  const next = submit && plansReady ? REVIEW_STATES.self_appraisal_submitted : REVIEW_STATES.not_started;
  if (submit && next === REVIEW_STATES.self_appraisal_submitted && !canTransitionReview(review.status, next)) {
    notFound();
  }
  const scores = scoresFromForm(formData, "self", allowedIds);
  await prisma.$transaction([
    prisma.review.update({
      where: { id },
      data: {
        selfSummary: String(formData.get("selfSummary") || ""),
        status: next,
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
  if (next === REVIEW_STATES.self_appraisal_submitted && review.reviewer?.user.email) {
    try {
      const cookie = (await headers()).get("cookie") ?? "";
      const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const res = await fetch(`${origin}/api/notify-manager`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie,
        },
        body: JSON.stringify({
          employeeName: fullName(review.employee),
          cycleName: review.cycle.name,
          reviewId: id,
          managerEmail: review.reviewer.user.email,
        }),
      });
      if (!res.ok) {
        console.error("[notify-manager] HTTP", res.status);
      }
    } catch (err) {
      console.error("[notify-manager] side effect failed", err);
    }
  }
  revalidatePath(`/reviews/${id}`);
  revalidatePath("/reviews");
}

export async function saveManagerReview(formData: FormData) {
  const access = await requireAccess();
  const id = String(formData.get("id") || "");
  const review = await prisma.review.findUnique({
    where: { id },
    include: { employee: { include: { user: true } } },
  });
  if (!review) notFound();
  assertCanWriteManagerReview(access, review);
  if (review.status !== REVIEW_STATES.self_appraisal_submitted) notFound();
  const allowedIds = await allowedRatingIds(id);
  const submit = String(formData.get("intent")) === "submit";
  const next = submit ? REVIEW_STATES.manager_reviewed : REVIEW_STATES.self_appraisal_submitted;
  if (submit && !canTransitionReview(review.status, next)) notFound();
  const scores = scoresFromForm(formData, "manager", allowedIds);
  await prisma.$transaction([
    prisma.review.update({
      where: { id },
      data: {
        managerSummary: String(formData.get("managerSummary") || ""),
        status: next,
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
          subject: `Manager reviewed: ${fullName(review.employee)}`,
          body: "A manager review is ready to mark completed.",
          reviewId: id,
        }),
      ),
    );
  }
  revalidatePath(`/reviews/${id}`);
  revalidatePath("/reviews");
}

export async function completeReview(formData: FormData) {
  const access = await requireAccess();
  assertHrAdmin(access);
  const id = String(formData.get("id") || "");
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) notFound();
  if (!canTransitionReview(review.status, REVIEW_STATES.completed)) notFound();
  const allowedIds = await allowedRatingIds(id);
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
      status: REVIEW_STATES.completed,
    },
    include: { employee: { include: { user: true } } },
  });
  await emailReviewEvent({
    toEmail: updated.employee.user.email,
    toName: fullName(updated.employee),
    subject: "Your Helix appraisal is completed",
    body: "HR admin has marked your review completed.",
    reviewId: id,
  });
  revalidatePath(`/reviews/${id}`);
  revalidatePath("/reports");
}
