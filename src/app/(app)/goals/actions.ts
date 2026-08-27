"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ROLES } from "@/lib/access";
import { requireAccess, assertCanViewEmployee } from "@/lib/auth";
import { GOAL_STATES, canTransitionGoal, goalPlanEditable } from "@/lib/workflow";

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
  if (goal.employeeId !== access.selfId) notFound();
  if (!goalPlanEditable(goal.status)) notFound();
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

export async function submitGoal(formData: FormData) {
  const access = await requireAccess();
  const id = String(formData.get("id") || "");
  const goal = await prisma.goal.findUnique({ where: { id } });
  if (!goal) notFound();
  if (goal.employeeId !== access.selfId) notFound();
  if (!canTransitionGoal(goal.status, GOAL_STATES.submitted)) notFound();
  await prisma.goal.update({ where: { id }, data: { status: GOAL_STATES.submitted } });
  revalidatePath("/goals");
}

export async function decideGoal(formData: FormData) {
  const access = await requireAccess();
  if (access.role === ROLES.employee) notFound();
  const id = String(formData.get("id") || "");
  const decision = String(formData.get("decision") || "");
  const next = decision === "approved" ? GOAL_STATES.approved : decision === "sent_back" ? GOAL_STATES.sent_back : null;
  if (!next) notFound();
  const goal = await prisma.goal.findUnique({ where: { id } });
  if (!goal) notFound();
  assertCanViewEmployee(access, goal.employeeId);
  if (goal.employeeId === access.selfId && access.role !== ROLES.hr_admin) notFound();
  if (!canTransitionGoal(goal.status, next)) notFound();
  await prisma.goal.update({ where: { id }, data: { status: next } });
  revalidatePath("/goals");
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
      status: GOAL_STATES.draft,
    },
  });
  await attachRatingIfReviewExists(goal.id, access.selfId, cycle.id);
  revalidatePath("/goals");
}
