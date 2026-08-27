import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, canManagePeople, isLeader } from "@/lib/auth";
import { RATING_BANDS, ratingBand } from "@/lib/labels";
import { displayOutcome } from "@/lib/outcomes";

export default async function ReportsPage() {
  const ctx = await requireSession();
  if (!ctx) redirect("/sign-in");
  const reportCount = ctx.user.employee?._count.reports ?? 0;
  if (!isLeader(ctx.user.role, reportCount)) {
    return (
      <div>
        <h1 className="serif text-4xl">Reports</h1>
        <p className="mt-3 text-[#3d4f56]">Org-level reports are available to people with direct reports, HR, and admin.</p>
      </div>
    );
  }

  const reviews = await prisma.review.findMany({
    where: canManagePeople(ctx.user.role) ? {} : { reviewerId: ctx.user.employee?.id ?? "__none__" },
    include: {
      employee: { include: { department: true } },
      goalRatings: { include: { goal: true } },
    },
  });

  const withOutcome = reviews
    .map((r) => ({ r, outcome: displayOutcome(r.goalRatings, r.finalRating) }))
    .filter((x) => x.outcome != null);
  const dist = RATING_BANDS.map((b) => ({
    ...b,
    n: withOutcome.filter((x) => ratingBand(x.outcome)?.label === b.label).length,
  }));

  const depts = new Map<string, { n: number; util: number; rated: number; ratedN: number }>();
  for (const { r, outcome } of reviews.map((rev) => ({ r: rev, outcome: displayOutcome(rev.goalRatings, rev.finalRating) }))) {
    const name = r.employee.department.name;
    const cur = depts.get(name) ?? { n: 0, util: 0, rated: 0, ratedN: 0 };
    cur.n += 1;
    cur.util += r.employee.utilizationActual;
    if (outcome != null) {
      cur.rated += outcome;
      cur.ratedN += 1;
    }
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
        Distribution uses review outcomes (calibrated final_rating, else weighted goal_ratings). The goal plan is not
        mixed into these numbers.
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
                  style={{ width: `${withOutcome.length ? (d.n / withOutcome.length) * 100 : 0}%` }}
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
                <th className="px-4 py-3">Avg outcome</th>
              </tr>
            </thead>
            <tbody>
              {[...depts.entries()].map(([name, d]) => (
                <tr key={name} className="border-t border-[#ebe4d6]">
                  <td className="px-4 py-3">{name}</td>
                  <td className="px-4 py-3">{d.n}</td>
                  <td className="px-4 py-3">{d.n ? Math.round(d.util / d.n) : 0}%</td>
                  <td className="px-4 py-3">{d.ratedN ? (d.rated / d.ratedN).toFixed(1) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
