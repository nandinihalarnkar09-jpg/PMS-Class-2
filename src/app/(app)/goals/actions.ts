"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, canManagePeople, isLeader } from "@/lib/auth";

async function attachRatingIfReviewExists(goalId: string, employeeId: string, cycleId: string) {
  const review = await prisma.review.findUnique({
    where: { cycleId_employeeId: { cycleId, employeeId } },
  });
  if (!review) return;
  await prisma.goalRating.upsert({
    where: { reviewId_goalId: { reviewId: review.id, goalId } },
    create: { reviewId: review.id, goalId },
    update: {},
  });
}

export async function updateGoalPlan(formData: FormData) {
  const ctx = await requireSession();
  if (!ctx) redirect("/sign-in");
  const id = String(formData.get("id") || "");
  const goal = await prisma.goal.findUnique({ where: { id } });
  if (!goal) return;
  const reportCount = ctx.user.employee?._count.reports ?? 0;
  const allowed =
    goal.employeeId === ctx.user.employee?.id ||
    canManagePeople(ctx.user.role) ||
    isLeader(ctx.user.role, reportCount);
  if (!allowed) return;
  await prisma.goal.update({
    where: { id },
    data: {
      title: String(formData.get("title") || goal.title).trim(),
      description: String(formData.get("description") || goal.description).trim(),
      successCriteria: String(formData.get("successCriteria") || "").trim(),
      category: String(formData.get("category") || goal.category),
      weight: Number(formData.get("weight") || goal.weight),
    },
  });
  revalidatePath("/goals");
  revalidatePath("/dashboard");
}

export async function addGoal(formData: FormData) {
  const ctx = await requireSession();
  if (!ctx?.user.employee) redirect("/sign-in");
  const cycle = await prisma.reviewCycle.findFirst({ where: { status: "ACTIVE" } });
  if (!cycle) return;
  const title = String(formData.get("title") || "").trim();
  if (!title) return;
  const goal = await prisma.goal.create({
    data: {
      employeeId: ctx.user.employee.id,
      cycleId: cycle.id,
      title,
      description: String(formData.get("description") || "").trim() || "Added during the live cycle.",
      successCriteria: String(formData.get("successCriteria") || "").trim(),
      category: String(formData.get("category") || "SELF"),
      weight: Number(formData.get("weight") || 10),
    },
  });
  await attachRatingIfReviewExists(goal.id, ctx.user.employee.id, cycle.id);
  revalidatePath("/goals");
}
