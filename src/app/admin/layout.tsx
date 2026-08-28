import { redirect } from "next/navigation";
import { HelixClerkProvider } from "@/components/helix-clerk-provider";
import { StaffShell } from "@/components/staff-shell";
import { requireEmployee } from "@/lib/current-employee";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const employee = await requireEmployee();
  if (employee.role !== "hr_admin") {
    redirect("/dashboard");
  }
  return (
    <HelixClerkProvider>
      <StaffShell>{children}</StaffShell>
    </HelixClerkProvider>
  );
}
