"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase";
import { requireEmployee } from "@/lib/current-employee";

const OPEN_STATUSES = new Set(["not_started"]);

function parseRating(value: FormDataEntryValue | null) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1 || n > 5) return null;
  return Math.round(n * 100) / 100;
}

export async function submitSelfAppraisal(formData: FormData) {
  const me = await requireEmployee();
  if (!me.manager_id) return;

  const { data: cycle } = await supabaseServer()
    .from("review_cycles")
    .select("id, name")
    .eq("status", "open")
    .limit(1)
    .maybeSingle();
  if (!cycle) return;

  const { data: goalRows } = await supabaseServer()
    .from("goals")
    .select("id, weightage")
    .eq("employee_id", me.id)
    .eq("cycle_id", cycle.id)
    .eq("status", "approved");

  const goals = goalRows ?? [];
  if (goals.length === 0) return;

  const ratings: { goalId: string; comment: string; rating: number; weightage: number }[] = [];
  for (const goal of goals) {
    const comment = String(formData.get(`comment_${goal.id}`) || "").trim();
    const rating = parseRating(formData.get(`rating_${goal.id}`));
    if (!comment || rating == null) return;
    ratings.push({ goalId: goal.id, comment, rating, weightage: Number(goal.weightage) });
  }

  const { data: existing } = await supabaseServer()
    .from("reviews")
    .select("id, status")
    .eq("employee_id", me.id)
    .eq("cycle_id", cycle.id)
    .maybeSingle();

  if (existing && !OPEN_STATUSES.has(existing.status)) return;

  const weightSum = ratings.reduce((sum, row) => sum + row.weightage, 0);
  const overall =
    weightSum > 0
      ? Math.round((ratings.reduce((sum, row) => sum + row.rating * row.weightage, 0) / weightSum) * 100) / 100
      : null;

  const submittedAt = new Date().toISOString();
  let reviewId = existing?.id ?? null;

  if (reviewId) {
    const { error } = await supabaseServer()
      .from("reviews")
      .update({
        status: "self_appraisal_submitted",
        submitted_at: submittedAt,
        overall_self_rating: overall,
        manager_id: me.manager_id,
      })
      .eq("id", reviewId)
      .eq("employee_id", me.id)
      .eq("cycle_id", cycle.id)
      .eq("status", "not_started");
    if (error) return;
  } else {
    const { data: created, error } = await supabaseServer()
      .from("reviews")
      .insert({
        employee_id: me.id,
        manager_id: me.manager_id,
        cycle_id: cycle.id,
        status: "self_appraisal_submitted",
        submitted_at: submittedAt,
        overall_self_rating: overall,
      })
      .select("id")
      .single();
    if (error || !created) return;
    reviewId = created.id;
  }

  for (const row of ratings) {
    const { data: existingRating } = await supabaseServer()
      .from("goal_ratings")
      .select("id")
      .eq("review_id", reviewId)
      .eq("goal_id", row.goalId)
      .maybeSingle();

    if (existingRating) {
      await supabaseServer()
        .from("goal_ratings")
        .update({ self_comment: row.comment, self_rating: row.rating })
        .eq("id", existingRating.id)
        .eq("review_id", reviewId);
    } else {
      await supabaseServer().from("goal_ratings").insert({
        review_id: reviewId,
        goal_id: row.goalId,
        self_comment: row.comment,
        self_rating: row.rating,
      });
    }
  }

  try {
    const { data: manager } = await supabaseServer()
      .from("employees")
      .select("email")
      .eq("id", me.manager_id)
      .maybeSingle();

    if (manager?.email) {
      const cookie = (await headers()).get("cookie") ?? "";
      const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const res = await fetch(`${origin}/api/notify-manager`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie,
        },
        body: JSON.stringify({
          employeeName: me.full_name,
          cycleName: cycle.name,
          reviewId,
          managerEmail: manager.email,
        }),
      });
      if (!res.ok) {
        console.error("[notify-manager] HTTP", res.status);
      }
    }
  } catch (err) {
    console.error("[notify-manager] side effect failed", err);
  }

  revalidatePath("/my-review");
}
