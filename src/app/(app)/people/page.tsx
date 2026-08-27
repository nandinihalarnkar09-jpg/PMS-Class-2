import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAccess, canSeePeopleDirectory, employeeScope } from "@/lib/auth";
import { fullName, initials, pct } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/labels";
import { ROLES } from "@/lib/access";

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; dept?: string }>;
}) {
  const access = await requireAccess();
  if (!canSeePeopleDirectory(access.role)) {
    redirect(`/people/${access.selfId}`);
  }
  const { q = "", dept = "" } = await searchParams;

  const departments = await prisma.department.findMany({ orderBy: { name: "asc" } });
  const people = await prisma.employee.findMany({
    where: {
      AND: [
        employeeScope(access),
        dept ? { departmentId: dept } : {},
        q
          ? {
              OR: [
                { firstName: { contains: q, mode: "insensitive" } },
                { lastName: { contains: q, mode: "insensitive" } },
                { title: { contains: q, mode: "insensitive" } },
                { employeeCode: { contains: q, mode: "insensitive" } },
                { user: { email: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {},
      ],
    },
    include: { department: true, user: true, manager: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 80,
  });
  const total = await prisma.employee.count({ where: employeeScope(access) });

  return (
    <div>
      <h1 className="serif text-4xl">People</h1>
      <p className="mt-2 text-[#3d4f56]">
        {access.role === ROLES.hr_admin
          ? `Full directory (${total}).`
          : `Your reporting line only (${total} people). Records outside this set return not found.`}
      </p>

      <form className="mt-6 flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name, title, HX code"
          className="flex-1 min-w-56 rounded-md border border-[#d8cfc0] bg-white px-3 py-2"
        />
        <select name="dept" defaultValue={dept} className="rounded-md border border-[#d8cfc0] bg-white px-3 py-2">
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <button className="rounded-md bg-[#162329] text-white px-4 py-2">Filter</button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-xl border border-[#d8cfc0] bg-white">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-[#3d4f56] bg-[#ebe4d6]">
            <tr>
              <th className="px-4 py-3">Person</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Manager</th>
              <th className="px-4 py-3">Util.</th>
              <th className="px-4 py-3">Role</th>
            </tr>
          </thead>
          <tbody>
            {people.map((p) => (
              <tr key={p.id} className="border-t border-[#ebe4d6]">
                <td className="px-4 py-3">
                  <Link href={`/people/${p.id}`} className="flex items-center gap-3 hover:underline">
                    <span className="h-8 w-8 rounded-full bg-[#1f6f64] text-white grid place-items-center text-xs">
                      {initials(p)}
                    </span>
                    <span>
                      <span className="block font-medium">{fullName(p)}</span>
                      <span className="text-[#3d4f56]">
                        {p.title} · {p.employeeCode}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3">{p.department.name}</td>
                <td className="px-4 py-3">{p.manager ? fullName(p.manager) : "—"}</td>
                <td className="px-4 py-3">{pct(p.utilizationActual)}</td>
                <td className="px-4 py-3">{ROLE_LABEL[p.user.role] ?? p.user.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-[#3d4f56]">Showing {people.length} of {total}.</p>
    </div>
  );
}
