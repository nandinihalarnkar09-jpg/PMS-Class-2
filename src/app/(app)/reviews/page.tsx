import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, canManagePeople, isLineManager } from "@/lib/auth";
import { REVIEW_STATUS, ratingBand } from "@/lib/labels";
import { fullName } from "@/lib/format";
import { displayOutcome, weightedScore } from "@/lib/outcomes";

const ratingInclude = { goalRatings: { include: { goal: true } } } as const;

export default async function ReviewsPage() {
  const ctx = await requireSession();
  if (!ctx) redirect("/sign-in");
  const emp = ctx.user.employee;
  const reportCount = emp?._count.reports ?? 0;

  const mine = emp
    ? await prisma.review.findMany({
        where: { employeeId: emp.id },
        include: { cycle: true, reviewer: true, ...ratingInclude },
      })
    : [];

  const team = emp
    ? await prisma.review.findMany({
        where: canManagePeople(ctx.user.role) ? {} : { reviewerId: emp.id },
        include: { cycle: true, employee: true, reviewer: true, ...ratingInclude },
        orderBy: { status: "asc" },
        take: canManagePeople(ctx.user.role) ? 40 : 80,
      })
    : [];

  const visibleTeam = canManagePeople(ctx.user.role) || isLineManager(reportCount)
    ? team.filter((r) => r.employeeId !== emp?.id)
    : [];

  return (
    <div>
      <h1 className="serif text-4xl">Reviews</h1>
      <p className="mt-2 text-[#3d4f56]">
        Outcomes live here: a narrative packet plus one goal_rating row per planned goal. The plan itself stays on
        Goals.
      </p>

      <h2 className="serif text-2xl mt-10">My packet</h2>
      <ul className="mt-3 space-y-2">
        {mine.map((r) => (
          <li key={r.id}>
            <Link href={`/reviews/${r.id}`} className="block rounded-xl border border-[#d8cfc0] bg-white p-4 hover:border-[#1f6f64]">
              <p className="font-medium">
                {r.cycle.name} <span className="text-[#3d4f56] font-normal">· {r.cycle.period}</span>
              </p>
              <p className="text-sm text-[#3d4f56] mt-1">
                {REVIEW_STATUS[r.status]}
                {r.reviewer ? ` · Reviewer ${fullName(r.reviewer)}` : ""}
                {ratingBand(displayOutcome(r.goalRatings, r.finalRating))?.label
                  ? ` · ${ratingBand(displayOutcome(r.goalRatings, r.finalRating))?.label}`
                  : ""}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      {visibleTeam.length > 0 ? (
        <>
          <h2 className="serif text-2xl mt-10">{canManagePeople(ctx.user.role) ? "Company queue" : "Team queue"}</h2>
          <div className="mt-3 overflow-x-auto rounded-xl border border-[#d8cfc0] bg-white">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-[#3d4f56] bg-[#ebe4d6]">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Self (weighted)</th>
                  <th className="px-4 py-3">Manager (weighted)</th>
                  <th className="px-4 py-3">Final</th>
                </tr>
              </thead>
              <tbody>
                {visibleTeam.map((r) => (
                  <tr key={r.id} className="border-t border-[#ebe4d6]">
                    <td className="px-4 py-3">
                      <Link href={`/reviews/${r.id}`} className="hover:underline font-medium">
                        {fullName(r.employee)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{REVIEW_STATUS[r.status]}</td>
                    <td className="px-4 py-3">{weightedScore(r.goalRatings, "selfScore") ?? "—"}</td>
                    <td className="px-4 py-3">{weightedScore(r.goalRatings, "managerScore") ?? "—"}</td>
                    <td className="px-4 py-3">{r.finalRating ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
