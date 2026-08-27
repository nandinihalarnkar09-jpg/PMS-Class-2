import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, canManagePeople, isLeader } from "@/lib/auth";
import { RATING_BANDS, ratingBand } from "@/lib/labels";

export default async function ReportsPage() {
  const ctx = await requireSession();
  if (!ctx) redirect("/sign-in");
  if (!isLeader(ctx.user.role)) {
    return (
      <div>
        <h1 className="serif text-4xl">Reports</h1>
        <p className="mt-3 text-[#3d4f56]">Org-level reports are available to managers, HR, and admin.</p>
      </div>
    );
  }

  const reviews = await prisma.review.findMany({
    where: canManagePeople(ctx.user.role) ? {} : { reviewerId: ctx.user.employee?.id ?? "__none__" },
    include: { employee: { include: { department: true } } },
  });

  const withFinal = reviews.filter((r) => r.finalRating != null || r.managerRating != null);
  const dist = RATING_BANDS.map((b) => ({
    ...b,
    n: withFinal.filter((r) => ratingBand(r.finalRating ?? r.managerRating)?.label === b.label).length,
  }));

  const depts = new Map<string, { n: number; util: number; rated: number }>();
  for (const r of reviews) {
    const name = r.employee.department.name;
    const cur = depts.get(name) ?? { n: 0, util: 0, rated: 0 };
    cur.n += 1;
    cur.util += r.employee.utilizationActual;
    cur.rated += r.finalRating ?? r.managerRating ?? 0;
    depts.set(name, cur);
  }

  const statusCounts = reviews.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <h1 className="serif text-4xl">Reports</h1>
      <p className="mt-2 text-[#3d4f56]">
        Calibration view for a services org: rating spread, cycle throughput, and utilization beside outcomes so high
        billability is not mistaken for high performance.
      </p>

      <section className="mt-8">
        <h2 className="serif text-2xl">Rating distribution</h2>
        <ul className="mt-4 space-y-2">
          {dist.map((d) => (
            <li key={d.label} className="flex items-center gap-3">
              <span className="w-36 text-sm">{d.label}</span>
              <div className="flex-1 h-3 rounded-full bg-[#ebe4d6]">
                <div
                  className="h-3 rounded-full bg-[#162329]"
                  style={{ width: `${withFinal.length ? (d.n / withFinal.length) * 100 : 0}%` }}
                />
              </div>
              <span className="w-10 text-right text-sm">{d.n}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="serif text-2xl">Cycle throughput</h2>
        <div className="mt-4 grid sm:grid-cols-3 gap-3">
          {Object.entries(statusCounts).map(([k, v]) => (
            <div key={k} className="rounded-xl border border-[#d8cfc0] bg-white p-4">
              <p className="text-xs uppercase text-[#3d4f56]">{k.replaceAll("_", " ")}</p>
              <p className="serif text-3xl mt-1">{v}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="serif text-2xl">Department snapshot</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-[#d8cfc0] bg-white">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-[#3d4f56] bg-[#ebe4d6]">
              <tr>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Packets</th>
                <th className="px-4 py-3">Avg util.</th>
                <th className="px-4 py-3">Avg rating</th>
              </tr>
            </thead>
            <tbody>
              {[...depts.entries()].map(([name, d]) => (
                <tr key={name} className="border-t border-[#ebe4d6]">
                  <td className="px-4 py-3">{name}</td>
                  <td className="px-4 py-3">{d.n}</td>
                  <td className="px-4 py-3">{d.n ? Math.round(d.util / d.n) : 0}%</td>
                  <td className="px-4 py-3">{d.n ? (d.rated / d.n).toFixed(1) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
