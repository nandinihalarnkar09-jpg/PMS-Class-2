"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase";

export type CycleStatus = "draft" | "open" | "closed";

export type ReviewCycleRow = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: CycleStatus;
  created_by: string;
};

async function createdByEmployeeId() {
  const admin = await supabaseServer()
    .from("employees")
    .select("id")
    .eq("role", "hr_admin")
    .limit(1)
    .maybeSingle();
  if (admin.data?.id) return admin.data.id;

  const anyone = await supabaseServer().from("employees").select("id").limit(1).maybeSingle();
  return anyone.data?.id ?? null;
}

export async function createReviewCycle(input: {
  name: string;
  start_date: string;
  end_date: string;
}) {
  const name = input.name.trim();
  if (!name || !input.start_date || !input.end_date) {
    return { ok: false as const, error: "Name, start date, and end date are required." };
  }
  if (input.end_date < input.start_date) {
    return { ok: false as const, error: "End date must be on or after the start date." };
  }

  const created_by = await createdByEmployeeId();
  if (!created_by) {
    return { ok: false as const, error: "Add an employee first so the cycle has a creator." };
  }

  const { error } = await supabaseServer().from("review_cycles").insert({
    name,
    start_date: input.start_date,
    end_date: input.end_date,
    status: "draft",
    created_by,
  });

  if (error) {
    return { ok: false as const, error: "Could not create this cycle." };
  }

  revalidatePath("/admin/cycles");
  return { ok: true as const };
}

export async function setCycleStatus(id: string, status: CycleStatus) {
  if (status === "open") {
    const { error: closeError } = await supabaseServer()
      .from("review_cycles")
      .update({ status: "closed" })
      .eq("status", "open")
      .neq("id", id);
    if (closeError) {
      return { ok: false as const, error: "Could not close the cycle that is already open." };
    }
  }

  const { error } = await supabaseServer().from("review_cycles").update({ status }).eq("id", id);
  if (error) {
    return { ok: false as const, error: "Could not update this cycle." };
  }

  revalidatePath("/admin/cycles");
  return { ok: true as const };
}
