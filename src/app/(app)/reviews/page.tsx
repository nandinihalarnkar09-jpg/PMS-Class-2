import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAccess, reviewScope, canSeeReports } from "@/lib/auth";
import { REVIEW_STATUS, ratingBand } from "@/lib/labels";
import { fullName } from "@/lib/format";
import { displayOutcome, weightedScore } from "@/lib/outcomes";
import { ROLES } from "@/lib/access";

const ratingInclude = { goalRatings: { include: { goal: true } } } as const;

export default async function ReviewsPage() {
  const access = await requireAccess();

  const mine = await prisma.review.findMany({
    where: { employeeId: access.selfId },
    include: { cycle: true, reviewer: true, ...ratingInclude },
  });

  const team = canSeeReports(access.role)
    ? await prisma.review.findMany({
        where: { AND: [reviewScope(access), { employeeId: { not: access.selfId } }] },
        include: { cycle: true, employee: true, reviewer: true, ...ratingInclude },
        orderBy: { status: "asc" },
        take: access.role === ROLES.hr_admin ? 40 : 80,
      })
    : [];

  return (
    <div>
      <h1 className="serif text-4xl">Reviews</h1>
      <p className="mt-2 text-[#3d4f56]">
        {access.role === ROLES.employee
          ? "Only your packet is listed. Another review id in the address bar returns not found."
          : access.role === ROLES.manager
            ? "Your packet plus people under you. You cannot open a peer’s packet."
            : "Company queue. You can mark manager_reviewed packets completed."}
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

      {team.length > 0 ? (
        <>
          <h2 className="serif text-2xl mt-10">{access.role === ROLES.hr_admin ? "Company queue" : "Team queue"}</h2>
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
                {team.map((r) => (
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
