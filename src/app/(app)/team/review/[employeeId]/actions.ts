"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase";
import { requireEmployee, type CurrentEmployee } from "@/lib/current-employee";

function parseRating(value: FormDataEntryValue | null) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1 || n > 5) return null;
  return Math.round(n * 100) / 100;
}

function canWriteManagerReview(me: CurrentEmployee, reviewManagerId: string) {
  return me.role === "hr_admin" || reviewManagerId === me.id;
}

export async function completeTeamReview(formData: FormData) {
  const me = await requireEmployee();
  const employeeId = String(formData.get("employee_id") || "");
  if (!employeeId) return;

  const { data: cycle } = await supabaseServer()
    .from("review_cycles")
    .select("id")
    .eq("status", "open")
    .limit(1)
    .maybeSingle();
  if (!cycle) return;

  const { data: review } = await supabaseServer()
    .from("reviews")
    .select("id, employee_id, manager_id, cycle_id, status")
    .eq("employee_id", employeeId)
    .eq("cycle_id", cycle.id)
    .maybeSingle();

  if (!review || review.status !== "self_appraisal_submitted") return;
  if (!canWriteManagerReview(me, review.manager_id)) return;

  const { data: goalRows } = await supabaseServer()
    .from("goals")
    .select("id")
    .eq("employee_id", review.employee_id)
    .eq("cycle_id", review.cycle_id)
    .eq("status", "approved");

  const goals = goalRows ?? [];
  if (goals.length === 0) return;

  const overall = parseRating(formData.get("overall_manager_rating"));
  const summary = String(formData.get("manager_summary") || "").trim();
  if (overall == null || !summary) return;

  const updates: { goalId: string; comment: string; rating: number }[] = [];
  for (const goal of goals) {
    const comment = String(formData.get(`manager_comment_${goal.id}`) || "").trim();
    const rating = parseRating(formData.get(`manager_rating_${goal.id}`));
    if (!comment || rating == null) return;
    updates.push({ goalId: goal.id, comment, rating });
  }

  for (const row of updates) {
    const { data: existing } = await supabaseServer()
      .from("goal_ratings")
      .select("id")
      .eq("review_id", review.id)
      .eq("goal_id", row.goalId)
      .maybeSingle();

    if (existing) {
      await supabaseServer()
        .from("goal_ratings")
        .update({ manager_comment: row.comment, manager_rating: row.rating })
        .eq("id", existing.id)
        .eq("review_id", review.id);
    } else {
      await supabaseServer().from("goal_ratings").insert({
        review_id: review.id,
        goal_id: row.goalId,
        manager_comment: row.comment,
        manager_rating: row.rating,
      });
    }
  }

  const { error } = await supabaseServer()
    .from("reviews")
    .update({
      overall_manager_rating: overall,
      manager_summary: summary,
      reviewed_at: new Date().toISOString(),
      status: "completed",
    })
    .eq("id", review.id)
    .eq("employee_id", review.employee_id)
    .eq("manager_id", review.manager_id)
    .eq("status", "self_appraisal_submitted");

  if (error) return;

  revalidatePath(`/team/review/${employeeId}`);
}
