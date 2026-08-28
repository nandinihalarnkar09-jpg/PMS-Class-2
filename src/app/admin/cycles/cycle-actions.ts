"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase";
import { requireEmployee } from "@/lib/current-employee";

export type CycleStatus = "draft" | "open" | "closed";

export type ReviewCycleRow = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: CycleStatus;
  created_by: string;
};

async function requireHrAdmin() {
  const employee = await requireEmployee();
  if (employee.role !== "hr_admin") {
    return { ok: false as const, error: "Only HR admin can manage cycles.", employee: null };
  }
  return { ok: true as const, employee };
}

export async function createReviewCycle(input: {
  name: string;
  start_date: string;
  end_date: string;
}) {
  const gate = await requireHrAdmin();
  if (!gate.ok || !gate.employee) {
    return { ok: false as const, error: gate.error ?? "Only HR admin can manage cycles." };
  }
  const name = input.name.trim();
  if (!name || !input.start_date || !input.end_date) {
    return { ok: false as const, error: "Name, start date, and end date are required." };
  }
  if (input.end_date < input.start_date) {
    return { ok: false as const, error: "End date must be on or after the start date." };
  }

  const created_by = gate.employee.id;

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
  const gate = await requireHrAdmin();
  if (!gate.ok) {
    return { ok: false as const, error: gate.error ?? "Only HR admin can manage cycles." };
  }
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
