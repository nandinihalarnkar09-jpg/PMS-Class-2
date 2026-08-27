import Link from "next/link";
import { requireAccess, canSeePeopleDirectory, canSeeReports } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/labels";
import { initials } from "@/lib/format";
import { UserMenu } from "@/components/user-menu";
import { prisma } from "@/lib/db";
import { ROLES } from "@/lib/access";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const access = await requireAccess();
  const emp = await prisma.employee.findUnique({ where: { id: access.selfId } });
  const nav = [
    { href: "/dashboard", label: "Home" },
    ...(canSeePeopleDirectory(access.role) ? [{ href: "/people", label: "People" }] : [{ href: `/people/${access.selfId}`, label: "My file" }]),
    { href: "/goals", label: "Goals" },
    { href: "/reviews", label: "Reviews" },
    { href: "/feedback", label: "Feedback" },
    ...(canSeeReports(access.role) ? [{ href: "/reports", label: "Reports" }] : []),
  ];

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="bg-[#162329] text-[#f4efe6] px-5 py-6 flex flex-col">
        <Link href="/dashboard" className="serif text-2xl tracking-tight">
          Helix <span className="text-[#e8b59a]">PMS</span>
        </Link>
        <p className="mt-1 text-xs text-[#9aada8]">
          {ROLE_LABEL[access.role]} · {access.role === ROLES.employee ? "own record only" : access.role === ROLES.manager ? "your reporting line" : "full company"}
        </p>
        <nav className="mt-10 flex lg:flex-col gap-1 overflow-x-auto">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-[#d8cfc0] hover:bg-white/8 hover:text-white whitespace-nowrap"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-8 hidden lg:block">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-[#1f6f64] grid place-items-center text-sm">
              {initials(emp)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{access.name}</p>
              <p className="text-xs text-[#9aada8]">{ROLE_LABEL[access.role]}</p>
            </div>
          </div>
          <div className="mt-4">
            <UserMenu />
          </div>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-[#d8cfc0] bg-[#f4efe6]">
          <p className="font-medium truncate">{access.name}</p>
          <UserMenu />
        </header>
        <div className="p-5 lg:p-10 max-w-6xl">{children}</div>
      </div>
    </div>
  );
}
