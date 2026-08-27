"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAccess, assertCanViewEmployee } from "@/lib/auth";

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
  const access = await requireAccess();
  const id = String(formData.get("id") || "");
  const goal = await prisma.goal.findUnique({ where: { id } });
  if (!goal) notFound();
  assertCanViewEmployee(access, goal.employeeId);
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
  const access = await requireAccess();
  const cycle = await prisma.reviewCycle.findFirst({ where: { status: "ACTIVE" } });
  if (!cycle) return;
  const title = String(formData.get("title") || "").trim();
  if (!title) return;
  const goal = await prisma.goal.create({
    data: {
      employeeId: access.selfId,
      cycleId: cycle.id,
      title,
      description: String(formData.get("description") || "").trim() || "Added during the live cycle.",
      successCriteria: String(formData.get("successCriteria") || "").trim(),
      category: String(formData.get("category") || "SELF"),
      weight: Number(formData.get("weight") || 10),
    },
  });
  await attachRatingIfReviewExists(goal.id, access.selfId, cycle.id);
  revalidatePath("/goals");
}
