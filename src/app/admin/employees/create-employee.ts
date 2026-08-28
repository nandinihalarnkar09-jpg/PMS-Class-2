"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase";
import { requireEmployee } from "@/lib/current-employee";

export type NewEmployeeInput = {
  full_name: string;
  email: string;
  designation: string;
  department: string;
  date_of_joining: string;
  manager_id: string | null;
  role: "employee" | "manager" | "hr_admin";
};

export async function createEmployee(input: NewEmployeeInput) {
  const actor = await requireEmployee();
  if (actor.role !== "hr_admin") {
    return { ok: false as const, error: "Only HR admin can add employees." };
  }
  const full_name = input.full_name.trim();
  const email = input.email.trim();
  if (!full_name || !email) {
    return { ok: false as const, error: "Name and email are required." };
  }

  const { error } = await supabaseServer().from("employees").insert({
    full_name,
    email,
    designation: input.designation.trim(),
    department: input.department.trim(),
    date_of_joining: input.date_of_joining || null,
    manager_id: input.manager_id,
    role: input.role,
    is_active: true,
  });

  if (error) {
    return { ok: false as const, error: "Could not save this employee." };
  }

  revalidatePath("/admin/employees");
  return { ok: true as const };
}
