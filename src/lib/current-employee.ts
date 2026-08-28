import { cache } from "react";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { supabaseServer } from "@/lib/supabase";

export type EmployeeRole = "employee" | "manager" | "hr_admin";

export type CurrentEmployee = {
  id: string;
  clerk_user_id: string | null;
  full_name: string;
  email: string;
  designation: string;
  department: string;
  date_of_joining: string;
  manager_id: string | null;
  role: EmployeeRole;
  is_active: boolean;
};

const EMPLOYEE_COLUMNS =
  "id, clerk_user_id, full_name, email, designation, department, date_of_joining, manager_id, role, is_active";

function clerkEmail(user: {
  primaryEmailAddressId: string | null;
  emailAddresses: { id: string; emailAddress: string }[];
}) {
  const primary = user.emailAddresses.find((address) => address.id === user.primaryEmailAddressId);
  return (primary?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? "").toLowerCase();
}

function clerkFullName(
  user: { firstName: string | null; lastName: string | null; fullName: string | null },
  email: string,
) {
  const fromParts = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  const name = fromParts || user.fullName?.trim() || "";
  return name || email.split("@")[0];
}

async function createEmployeeFromClerk(userId: string, email: string, fullName: string) {
  const { data, error } = await supabaseServer()
    .from("employees")
    .insert({
      clerk_user_id: userId,
      full_name: fullName,
      email,
      designation: "Staff",
      department: "Unassigned",
      date_of_joining: new Date().toISOString().slice(0, 10),
      role: "employee",
      is_active: true,
    })
    .select(EMPLOYEE_COLUMNS)
    .maybeSingle();

  if (error) {
    console.error("[current-employee] create failed", error.message);
    return null;
  }
  return data as CurrentEmployee | null;
}

/**
 * Runs on the server (React cache, one lookup per request).
 * Clerk email is not a secret, but clerk_user_id writes and the employee row must stay off the client.
 */
export const getCurrentEmployee = cache(async (): Promise<CurrentEmployee | null> => {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  if (!user) return null;

  const email = clerkEmail(user);
  if (!email) return null;

  const { data: row, error } = await supabaseServer()
    .from("employees")
    .select(EMPLOYEE_COLUMNS)
    .ilike("email", email)
    .maybeSingle();

  if (error) {
    console.error("[current-employee] lookup failed", error.message);
    return null;
  }

  if (!row) {
    return createEmployeeFromClerk(userId, email, clerkFullName(user, email));
  }

  const employee = row as CurrentEmployee;
  if (!employee.clerk_user_id) {
    const { data: linked } = await supabaseServer()
      .from("employees")
      .update({ clerk_user_id: userId })
      .eq("id", employee.id)
      .select(EMPLOYEE_COLUMNS)
      .maybeSingle();
    return (linked as CurrentEmployee | null) ?? { ...employee, clerk_user_id: userId };
  }

  return employee;
});

export async function requireEmployee() {
  await auth.protect();
  const employee = await getCurrentEmployee();
  if (!employee) redirect("/account-not-setup");
  return employee;
}
