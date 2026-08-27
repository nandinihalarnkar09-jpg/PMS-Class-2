"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, isLeader } from "@/lib/auth";

export async function updateGoalProgress(formData: FormData) {
  const ctx = await requireSession();
  if (!ctx) redirect("/sign-in");
  const id = String(formData.get("id") || "");
  const progress = Number(formData.get("progress") || 0);
  const status = String(formData.get("status") || "ON_TRACK");
  const goal = await prisma.goal.findUnique({ where: { id } });
  if (!goal) return;
  const allowed =
    goal.employeeId === ctx.user.employee?.id || isLeader(ctx.user.role);
  if (!allowed) return;
  await prisma.goal.update({
    where: { id },
    data: { progress: Math.max(0, Math.min(100, progress)), status },
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
  await prisma.goal.create({
    data: {
      employeeId: ctx.user.employee.id,
      cycleId: cycle.id,
      title,
      description: String(formData.get("description") || "").trim() || "Added during the live cycle.",
      category: String(formData.get("category") || "SELF"),
      weight: Number(formData.get("weight") || 10),
      progress: 0,
      status: "NOT_STARTED",
    },
  });
  revalidatePath("/goals");
}
