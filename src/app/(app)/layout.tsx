import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/labels";
import { initials } from "@/lib/format";
import { UserMenu } from "@/components/user-menu";

const NAV = [
  { href: "/dashboard", label: "Home" },
  { href: "/people", label: "People" },
  { href: "/goals", label: "Goals" },
  { href: "/reviews", label: "Reviews" },
  { href: "/feedback", label: "Feedback" },
  { href: "/reports", label: "Reports" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireSession();
  if (!ctx) redirect("/sign-in");
  const emp = ctx.user.employee;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="bg-[#162329] text-[#f4efe6] px-5 py-6 flex flex-col">
        <Link href="/dashboard" className="serif text-2xl tracking-tight">
          Helix <span className="text-[#e8b59a]">PMS</span>
        </Link>
        <p className="mt-1 text-xs text-[#9aada8]">FY 2025–26 appraisal</p>
        <nav className="mt-10 flex lg:flex-col gap-1 overflow-x-auto">
          {NAV.map((item) => (
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
              <p className="truncate text-sm font-medium">{ctx.session.name}</p>
              <p className="text-xs text-[#9aada8]">{ROLE_LABEL[ctx.user.role] ?? ctx.user.role}</p>
            </div>
          </div>
          <div className="mt-4">
            <UserMenu />
          </div>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-[#d8cfc0] bg-[#f4efe6]">
          <p className="font-medium truncate">{ctx.session.name}</p>
          <UserMenu />
        </header>
        <div className="p-5 lg:p-10 max-w-6xl">{children}</div>
      </div>
    </div>
  );
}
