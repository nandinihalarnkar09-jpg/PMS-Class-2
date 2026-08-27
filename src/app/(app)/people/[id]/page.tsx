import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAccess, assertCanViewEmployee, canSeePeopleDirectory } from "@/lib/auth";
import { formatDate, fullName, initials, pct } from "@/lib/format";
import { GOAL_CATEGORY, GOAL_STATUS, REVIEW_STATUS, ROLE_LABEL, ratingBand } from "@/lib/labels";
import { displayOutcome } from "@/lib/outcomes";

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const access = await requireAccess();
  const { id } = await params;
  assertCanViewEmployee(access, id);
  const person = await prisma.employee.findUnique({
    where: { id },
    include: {
      department: true,
      user: true,
      manager: true,
      reports: {
        where: { id: { in: access.visibleIds } },
        take: 12,
        orderBy: { lastName: "asc" },
      },
      goals: { orderBy: { category: "asc" } },
      reviews: { include: { cycle: true, goalRatings: { include: { goal: true } } }, take: 1 },
    },
  });
  if (!person) notFound();
  const review = person.reviews[0];
  const band = ratingBand(review ? displayOutcome(review.goalRatings, review.finalRating) : null);

  return (
    <div>
      <Link href={canSeePeopleDirectory(access.role) ? "/people" : "/dashboard"} className="text-sm text-[#1f6f64]">
        {canSeePeopleDirectory(access.role) ? "← People" : "← Home"}
      </Link>
      <div className="mt-4 flex items-start gap-4">
        <div className="h-16 w-16 rounded-full bg-[#162329] text-white grid place-items-center text-xl">
          {initials(person)}
        </div>
        <div>
          <h1 className="serif text-4xl">{fullName(person)}</h1>
          <p className="text-[#3d4f56] mt-1">
            {person.title} · {person.department.name} · {person.location}
          </p>
          <p className="text-sm text-[#3d4f56] mt-1">
            {person.employeeCode} · Band {person.band} · Joined {formatDate(person.joinDate)} ·{" "}
                {ROLE_LABEL[person.user.role] ?? person.user.role}
          </p>
        </div>
      </div>

      <div className="mt-8 grid sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-[#d8cfc0] bg-white p-4">
          <p className="text-xs uppercase text-[#3d4f56]">Manager</p>
          <p className="mt-1 font-medium">{person.manager ? fullName(person.manager) : "—"}</p>
        </div>
        <div className="rounded-xl border border-[#d8cfc0] bg-white p-4">
          <p className="text-xs uppercase text-[#3d4f56]">Utilization</p>
          <p className="mt-1 font-medium">
            {pct(person.utilizationActual)} <span className="text-[#3d4f56] font-normal">/ {person.utilizationTarget}% target</span>
          </p>
        </div>
        <div className="rounded-xl border border-[#d8cfc0] bg-white p-4">
          <p className="text-xs uppercase text-[#3d4f56]">Cycle rating</p>
          <p className="mt-1 font-medium">{band ? `${band.label}` : "Pending"}</p>
        </div>
      </div>

      {person.reports.length > 0 ? (
        <section className="mt-10">
          <h2 className="serif text-2xl">Direct reports</h2>
          <ul className="mt-3 grid sm:grid-cols-2 gap-2">
            {person.reports.map((r) => (
              <li key={r.id}>
                <Link href={`/people/${r.id}`} className="block rounded-lg border border-[#d8cfc0] bg-white px-3 py-2 hover:border-[#1f6f64]">
                  {fullName(r)} <span className="text-[#3d4f56]">· {r.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="serif text-2xl">Goal plan</h2>
        <ul className="mt-3 space-y-2">
          {person.goals.map((g) => (
            <li key={g.id} className="rounded-xl border border-[#d8cfc0] bg-white p-4">
              <div className="flex justify-between gap-2">
                <p className="font-medium">{g.title}</p>
                <span className="text-xs">{GOAL_STATUS[g.status] ?? g.status} · {GOAL_CATEGORY[g.category]} · {g.weight}%</span>
              </div>
              <p className="text-sm text-[#3d4f56] mt-1">{g.description}</p>
            </li>
          ))}
        </ul>
      </section>

      {review ? (
        <section className="mt-10">
          <h2 className="serif text-2xl">Current review</h2>
          <p className="mt-2 text-[#3d4f56]">
            {review.cycle.name} · {REVIEW_STATUS[review.status]}
          </p>
          <Link href={`/reviews/${review.id}`} className="inline-block mt-3 text-sm text-[#c24e1d] font-medium">
            Open packet →
          </Link>
        </section>
      ) : null}
    </div>
  );
}
