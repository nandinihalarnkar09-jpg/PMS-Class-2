import { redirect } from "next/navigation";
import { StaffShell } from "@/components/staff-shell";
import { requireEmployee } from "@/lib/current-employee";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const employee = await requireEmployee();
  if (employee.role !== "hr_admin") {
    redirect("/dashboard");
  }
  return <StaffShell>{children}</StaffShell>;
}
