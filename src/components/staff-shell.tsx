import Link from "next/link";
import { Show, UserButton } from "@clerk/nextjs";
import { requireEmployee, type EmployeeRole } from "@/lib/current-employee";

function navFor(role: EmployeeRole) {
  const items = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/goals", label: "My Goals" },
    { href: "/reviews", label: "My Review" },
  ];
  if (role === "manager") {
    items.push({ href: "/my-team", label: "My Team" });
  }
  if (role === "hr_admin") {
    items.push({ href: "/admin/employees", label: "Employees" });
    items.push({ href: "/admin/cycles", label: "Cycles" });
  }
  return items;
}

export async function StaffShell({ children }: { children: React.ReactNode }) {
  const employee = await requireEmployee();
  const items = navFor(employee.role);

  return (
    <div className="min-h-screen bg-[#f4efe6]">
      <header className="border-b border-[#d8cfc0] bg-[#162329] text-[#f4efe6]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-6 py-3">
          <Link href="/dashboard" className="serif text-xl tracking-tight">
            Helix PMS
          </Link>
          <nav className="flex flex-1 flex-wrap gap-1">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-1.5 text-sm text-[#d8cfc0] hover:bg-white/10 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <p className="hidden text-xs text-[#9aada8] sm:block">{employee.full_name}</p>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </div>
  );
}
