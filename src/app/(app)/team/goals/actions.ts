"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase";
import { requireEmployee, type CurrentEmployee } from "@/lib/current-employee";

function canReviewTeamGoals(employee: CurrentEmployee) {
  return employee.role === "manager" || employee.role === "hr_admin";
}

async function submittedReportGoal(goalId: string, actor: CurrentEmployee) {
  if (!canReviewTeamGoals(actor) || !goalId) return null;

  const { data: goal } = await supabaseServer()
    .from("goals")
    .select("id, employee_id, status")
    .eq("id", goalId)
    .eq("status", "submitted")
    .maybeSingle();

  if (!goal) return null;

  const { data: owner } = await supabaseServer()
    .from("employees")
    .select("id, manager_id")
    .eq("id", goal.employee_id)
    .maybeSingle();

  if (!owner || owner.manager_id !== actor.id) return null;
  return goal;
}

export async function approveGoal(formData: FormData) {
  const me = await requireEmployee();
  const goal = await submittedReportGoal(String(formData.get("id") || ""), me);
  if (!goal) return;

  await supabaseServer()
    .from("goals")
    .update({ status: "approved" })
    .eq("id", goal.id)
    .eq("employee_id", goal.employee_id)
    .eq("status", "submitted");

  revalidatePath("/team/goals");
  revalidatePath("/goals");
}

export async function sendBackGoal(formData: FormData) {
  const me = await requireEmployee();
  const comment = String(formData.get("manager_comment") || "").trim();
  if (!comment) return;

  const goal = await submittedReportGoal(String(formData.get("id") || ""), me);
  if (!goal) return;

  await supabaseServer()
    .from("goals")
    .update({ status: "sent_back", manager_comment: comment })
    .eq("id", goal.id)
    .eq("employee_id", goal.employee_id)
    .eq("status", "submitted");

  revalidatePath("/team/goals");
  revalidatePath("/goals");
}
