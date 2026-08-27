import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, canManagePeople, isLeader } from "@/lib/auth";
import { GOAL_CATEGORY } from "@/lib/labels";
import { addGoal, updateGoalPlan } from "./actions";

export default async function GoalsPage() {
  const ctx = await requireSession();
  if (!ctx) redirect("/sign-in");
  const emp = ctx.user.employee;
  if (!emp) return <p>No employee profile linked.</p>;
  const reportCount = emp._count.reports;

  const own = await prisma.goal.findMany({
    where: { employeeId: emp.id },
    include: { cycle: true },
    orderBy: { category: "asc" },
  });

  const team =
    isLeader(ctx.user.role, reportCount)
      ? await prisma.goal.findMany({
          where: canManagePeople(ctx.user.role) ? {} : { employee: { managerId: emp.id } },
          include: { employee: true, cycle: true },
          take: 40,
          orderBy: { title: "asc" },
        })
      : [];

  const visibleTeam = team.filter((g) => g.employeeId !== emp.id);

  return (
    <div>
      <h1 className="serif text-4xl">Goals</h1>
      <p className="mt-2 text-[#3d4f56]">
        This is the plan: what you committed to and how it is weighted. Scores belong on the review packet as goal
        ratings — they are not stored here.
      </p>

      <form action={addGoal} className="mt-8 rounded-xl border border-[#d8cfc0] bg-white p-4 grid md:grid-cols-2 gap-3">
        <p className="md:col-span-2 font-medium">Add a goal to the plan</p>
        <input name="title" required placeholder="Title" className="rounded-md border border-[#d8cfc0] px-3 py-2" />
        <select name="category" className="rounded-md border border-[#d8cfc0] px-3 py-2">
          {Object.entries(GOAL_CATEGORY).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <textarea name="description" placeholder="What you will do" className="md:col-span-2 rounded-md border border-[#d8cfc0] px-3 py-2 min-h-20" />
        <textarea name="successCriteria" placeholder="How we will know it is done" className="md:col-span-2 rounded-md border border-[#d8cfc0] px-3 py-2 min-h-16" />
        <input name="weight" type="number" min={5} max={50} defaultValue={10} className="rounded-md border border-[#d8cfc0] px-3 py-2" />
        <button className="rounded-md bg-[#1f6f64] text-white px-4 py-2">Save goal</button>
      </form>

      <ul className="mt-8 space-y-3">
        {own.map((g) => (
          <li key={g.id} className="rounded-xl border border-[#d8cfc0] bg-white p-4">
            <form action={updateGoalPlan} className="space-y-3">
              <input type="hidden" name="id" value={g.id} />
              <div className="flex flex-wrap justify-between gap-2">
                <p className="text-xs uppercase tracking-wide text-[#c24e1d]">{GOAL_CATEGORY[g.category]}</p>
                <p className="text-sm text-[#3d4f56]">{g.cycle.period}</p>
              </div>
              <input name="title" defaultValue={g.title} className="w-full rounded-md border border-[#d8cfc0] px-3 py-2 font-medium" />
              <textarea name="description" defaultValue={g.description} className="w-full rounded-md border border-[#d8cfc0] px-3 py-2 min-h-16 text-sm" />
              <textarea name="successCriteria" defaultValue={g.successCriteria} placeholder="Success criteria" className="w-full rounded-md border border-[#d8cfc0] px-3 py-2 min-h-14 text-sm" />
              <div className="flex flex-wrap items-end gap-2">
                <select name="category" defaultValue={g.category} className="rounded-md border border-[#d8cfc0] px-2 py-1 text-sm">
                  {Object.entries(GOAL_CATEGORY).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <label className="text-sm">
                  Weight
                  <input name="weight" type="number" min={5} max={80} defaultValue={g.weight} className="ml-2 w-20 rounded-md border border-[#d8cfc0] px-2 py-1" />
                </label>
                <button className="text-sm text-[#c24e1d]">Update plan</button>
              </div>
            </form>
          </li>
        ))}
      </ul>

      {visibleTeam.length > 0 ? (
        <section className="mt-12">
          <h2 className="serif text-2xl">Team plans</h2>
          <p className="text-sm text-[#3d4f56] mt-1">People who report to you via manager_id.</p>
          <ul className="mt-4 divide-y divide-[#d8cfc0] rounded-xl border border-[#d8cfc0] bg-white">
            {visibleTeam.map((g) => (
              <li key={g.id} className="px-4 py-3 flex justify-between gap-3 text-sm">
                <span>
                  <span className="font-medium">
                    {g.employee.firstName} {g.employee.lastName}
                  </span>
                  <span className="text-[#3d4f56]"> · {g.title}</span>
                </span>
                <span>{g.weight}% · {GOAL_CATEGORY[g.category]}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
