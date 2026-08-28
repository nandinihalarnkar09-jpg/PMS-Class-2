"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase";
import { requireEmployee } from "@/lib/current-employee";

export type GoalStatus = "draft" | "submitted" | "approved" | "sent_back";

export type GoalRow = {
  id: string;
  employee_id: string;
  cycle_id: string;
  title: string;
  description: string | null;
  weightage: number;
  target_date: string | null;
  status: GoalStatus;
  manager_comment: string | null;
};

async function openCycle() {
  const { data } = await supabaseServer()
    .from("review_cycles")
    .select("id, name")
    .eq("status", "open")
    .limit(1)
    .maybeSingle();
  return data;
}

async function ownGoal(id: string, employeeId: string) {
  const { data } = await supabaseServer()
    .from("goals")
    .select("id, employee_id, cycle_id, title, description, weightage, target_date, status, manager_comment")
    .eq("id", id)
    .eq("employee_id", employeeId)
    .maybeSingle();
  return data as GoalRow | null;
}

function weightTotal(rows: { weightage: number }[]) {
  return Math.round(rows.reduce((sum, row) => sum + Number(row.weightage), 0) * 100) / 100;
}

export async function addGoal(formData: FormData) {
  const me = await requireEmployee();
  const cycle = await openCycle();
  if (!cycle) return;

  const title = String(formData.get("title") || "").trim();
  if (!title) return;

  await supabaseServer().from("goals").insert({
    employee_id: me.id,
    cycle_id: cycle.id,
    title,
    description: String(formData.get("description") || "").trim() || null,
    weightage: Number(formData.get("weightage") || 0),
    target_date: String(formData.get("target_date") || "") || null,
    status: "draft",
  });

  revalidatePath("/goals");
}

export async function updateGoal(formData: FormData) {
  const me = await requireEmployee();
  const id = String(formData.get("id") || "");
  const goal = await ownGoal(id, me.id);
  if (!goal || (goal.status !== "draft" && goal.status !== "sent_back")) return;

  await supabaseServer()
    .from("goals")
    .update({
      title: String(formData.get("title") || goal.title).trim(),
      description: String(formData.get("description") || "").trim() || null,
      weightage: Number(formData.get("weightage") || goal.weightage),
      target_date: String(formData.get("target_date") || "") || null,
    })
    .eq("id", goal.id)
    .eq("employee_id", me.id)
    .in("status", ["draft", "sent_back"]);

  revalidatePath("/goals");
}

export async function deleteGoal(formData: FormData) {
  const me = await requireEmployee();
  const id = String(formData.get("id") || "");
  const goal = await ownGoal(id, me.id);
  if (!goal || goal.status !== "draft") return;

  await supabaseServer().from("goals").delete().eq("id", goal.id).eq("employee_id", me.id).eq("status", "draft");
  revalidatePath("/goals");
}

export async function submitAllGoals() {
  const me = await requireEmployee();
  const cycle = await openCycle();
  if (!cycle) return;

  const { data } = await supabaseServer()
    .from("goals")
    .select("id, weightage, status")
    .eq("employee_id", me.id)
    .eq("cycle_id", cycle.id);

  const rows = data ?? [];
  if (weightTotal(rows) !== 100) return;

  await supabaseServer()
    .from("goals")
    .update({ status: "submitted" })
    .eq("employee_id", me.id)
    .eq("cycle_id", cycle.id)
    .in("status", ["draft", "sent_back"]);

  revalidatePath("/goals");
}
