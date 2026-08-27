import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession, isLineManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fullName, pct } from "@/lib/format";
import { GOAL_CATEGORY, REVIEW_STATUS, ratingBand } from "@/lib/labels";
import { displayOutcome } from "@/lib/outcomes";

export default async function DashboardPage() {
  const ctx = await requireSession();
  if (!ctx) redirect("/sign-in");
  const { user } = ctx;
  const emp = user.employee;
  const reportCount = emp?._count.reports ?? 0;

  const [headcount, cycle, myGoals, myReview, pendingTeam, recentFeedback, deptCount] = await Promise.all([
    prisma.employee.count(),
    prisma.reviewCycle.findFirst({ where: { status: "ACTIVE" } }),
    emp
      ? prisma.goal.findMany({ where: { employeeId: emp.id }, orderBy: { category: "asc" } })
      : Promise.resolve([]),
    emp
      ? prisma.review.findFirst({
          where: { employeeId: emp.id },
          include: { cycle: true, goalRatings: { include: { goal: true } } },
        })
      : Promise.resolve(null),
    emp && isLineManager(reportCount)
      ? prisma.review.count({
          where: { reviewerId: emp.id, status: { in: ["SELF_SUBMITTED", "MANAGER_IN_PROGRESS"] } },
        })
      : Promise.resolve(0),
    prisma.feedback.findMany({
      where: { toId: user.id },
      include: { from: { include: { employee: true } } },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.department.count(),
  ]);

  const outcome = myReview ? displayOutcome(myReview.goalRatings, myReview.finalRating) : null;

  return (
    <div>
      <p className="text-xs tracking-[0.22em] uppercase text-[#3d4f56]">Helix Consulting · {headcount} people</p>
      <h1 className="serif text-4xl mt-2">Good to have you, {emp?.firstName ?? "there"}.</h1>
      <p className="mt-2 text-[#3d4f56] max-w-2xl">
        {cycle ? `${cycle.name} (${cycle.period}) is ${cycle.status.toLowerCase()}.` : "No active cycle."} Goals are the
        plan. Reviews and goal ratings are the outcome. A manager is an employee with reports through manager_id.
      </p>

      <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat k="Company" v={String(headcount)} s={`${deptCount} departments`} />
        <Stat k="My utilization" v={emp ? pct(emp.utilizationActual) : "—"} s={`Target ${emp?.utilizationTarget ?? "—"}%`} />
        <Stat k="Plan" v={String(myGoals.length)} s="goals this cycle (not scores)" />
        <Stat
          k="My review"
          v={myReview ? REVIEW_STATUS[myReview.status] : "—"}
          s={ratingBand(outcome)?.label ?? "No outcome yet"}
        />
      </div>

      {isLineManager(reportCount) ? (
        <div className="mt-6 rounded-xl border border-[#d8cfc0] bg-white px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-medium">Team queue</p>
            <p className="text-sm text-[#3d4f56]">{pendingTeam} review{pendingTeam === 1 ? "" : "s"} waiting on you.</p>
          </div>
          <Link href="/reviews" className="text-sm text-[#c24e1d] font-medium">
            Open reviews →
          </Link>
        </div>
      ) : null}

      <div className="mt-10 grid lg:grid-cols-2 gap-8">
        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="serif text-2xl">Goal plan</h2>
            <Link href="/goals" className="text-sm text-[#1f6f64]">
              View all
            </Link>
          </div>
          <ul className="mt-4 space-y-3">
            {myGoals.length === 0 ? <li className="text-[#3d4f56] text-sm">No goals assigned.</li> : null}
            {myGoals.map((g) => (
              <li key={g.id} className="rounded-xl border border-[#d8cfc0] bg-white p-4">
                <div className="flex justify-between gap-3">
                  <p className="font-medium">{g.title}</p>
                  <span className="text-xs text-[#3d4f56]">{GOAL_CATEGORY[g.category]} · {g.weight}%</span>
                </div>
                <p className="mt-2 text-sm text-[#3d4f56]">{g.description}</p>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="serif text-2xl">Recent feedback</h2>
            <Link href="/feedback" className="text-sm text-[#1f6f64]">
              Give some
            </Link>
          </div>
          <ul className="mt-4 space-y-3">
            {recentFeedback.length === 0 ? <li className="text-sm text-[#3d4f56]">Nothing yet.</li> : null}
            {recentFeedback.map((f) => (
              <li key={f.id} className="rounded-xl border border-[#d8cfc0] bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-[#c24e1d]">{f.type}</p>
                <p className="mt-2 text-sm leading-relaxed">{f.message}</p>
                <p className="mt-2 text-xs text-[#3d4f56]">From {fullName(f.from.employee)}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Stat({ k, v, s }: { k: string; v: string; s: string }) {
  return (
    <div className="rounded-xl border border-[#d8cfc0] bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-[#3d4f56]">{k}</p>
      <p className="serif text-2xl mt-1">{v}</p>
      <p className="text-xs text-[#3d4f56] mt-1">{s}</p>
    </div>
  );
}
