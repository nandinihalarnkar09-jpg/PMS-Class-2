import Link from "next/link";
import { requireAccess, canSeeReports } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fullName, pct } from "@/lib/format";
import { GOAL_STATUS, REVIEW_STATUS, ratingBand } from "@/lib/labels";
import { displayOutcome } from "@/lib/outcomes";
import { ROLES } from "@/lib/access";

export default async function DashboardPage() {
  const access = await requireAccess();
  const emp = await prisma.employee.findUnique({
    where: { id: access.selfId },
    include: { department: true },
  });

  const [headcount, cycle, myGoals, myReview, pendingTeam, recentFeedback, deptCount] = await Promise.all([
    prisma.employee.count({ where: access.role === ROLES.hr_admin ? {} : { id: { in: access.visibleIds } } }),
    prisma.reviewCycle.findFirst({ where: { status: "ACTIVE" } }),
    prisma.goal.findMany({ where: { employeeId: access.selfId }, orderBy: { category: "asc" } }),
    prisma.review.findFirst({
      where: { employeeId: access.selfId },
      include: { cycle: true, goalRatings: { include: { goal: true } } },
    }),
    canSeeReports(access.role)
      ? prisma.review.count({
          where: {
            employeeId: { in: access.visibleIds.filter((id) => id !== access.selfId) },
            status: { in: ["self_appraisal_submitted", "manager_reviewed"] },
          },
        })
      : Promise.resolve(0),
    prisma.feedback.findMany({
      where: { toId: access.userId },
      include: { from: { include: { employee: true } } },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.department.count(),
  ]);

  const outcome = myReview ? displayOutcome(myReview.goalRatings, myReview.finalRating) : null;

  return (
    <div>
      <p className="text-xs tracking-[0.22em] uppercase text-[#3d4f56]">
        Signed in as {access.role.replace("_", " ")}
      </p>
      <h1 className="serif text-4xl mt-2">Good to have you, {emp?.firstName ?? "there"}.</h1>
      <p className="mt-2 text-[#3d4f56] max-w-2xl">
        {access.role === ROLES.employee
          ? "You can open your own goals and review packet. Other people’s files return not found if you change the URL."
          : access.role === ROLES.manager
            ? "You see your own record plus anyone under you in manager_id. Calibration stays with HR admin."
            : "HR admin can open any employee file and mark reviews completed."}{" "}
        {cycle ? `${cycle.name} (${cycle.period}) is ${cycle.status.toLowerCase()}.` : ""}
      </p>

      <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          k={access.role === ROLES.employee ? "My record" : access.role === ROLES.manager ? "Visible people" : "Company"}
          v={String(headcount)}
          s={`${deptCount} departments`}
        />
        <Stat k="My utilization" v={emp ? pct(emp.utilizationActual) : "—"} s={`Target ${emp?.utilizationTarget ?? "—"}%`} />
        <Stat k="My plan" v={String(myGoals.length)} s="goals this cycle" />
        <Stat
          k="My review"
          v={myReview ? REVIEW_STATUS[myReview.status] : "—"}
          s={ratingBand(outcome)?.label ?? "No outcome yet"}
        />
      </div>

      {canSeeReports(access.role) ? (
        <div className="mt-6 rounded-xl border border-[#d8cfc0] bg-white px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-medium">{access.role === ROLES.hr_admin ? "Company queue" : "Team queue"}</p>
            <p className="text-sm text-[#3d4f56]">{pendingTeam} review{pendingTeam === 1 ? "" : "s"} waiting.</p>
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
                  <span className="text-xs text-[#3d4f56]">{GOAL_STATUS[g.status] ?? g.status} · {g.weight}%</span>
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
