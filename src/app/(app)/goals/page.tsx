import { prisma } from "@/lib/db";
import { requireAccess, goalScope } from "@/lib/auth";
import { GOAL_CATEGORY, GOAL_STATUS } from "@/lib/labels";
import { addGoal, decideGoal, submitGoal, updateGoalPlan } from "./actions";
import { ROLES } from "@/lib/access";
import { GOAL_STATES, goalPlanEditable } from "@/lib/workflow";

export default async function GoalsPage() {
  const access = await requireAccess();

  const own = await prisma.goal.findMany({
    where: { employeeId: access.selfId },
    include: { cycle: true },
    orderBy: { category: "asc" },
  });

  const team =
    access.role === ROLES.employee
      ? []
      : await prisma.goal.findMany({
          where: { AND: [goalScope(access), { employeeId: { not: access.selfId } }] },
          include: { employee: true, cycle: true },
          take: 40,
          orderBy: { title: "asc" },
        });

  const pendingApproval = team.filter((g) => g.status === GOAL_STATES.submitted);

  return (
    <div>
      <h1 className="serif text-4xl">Goals</h1>
      <p className="mt-2 text-[#3d4f56]">
        Plan workflow: draft → submitted → approved, or sent back to draft-quality edits. Scores still live on the
        review, not on the goal.
      </p>

      <form action={addGoal} className="mt-8 rounded-xl border border-[#d8cfc0] bg-white p-4 grid md:grid-cols-2 gap-3">
        <p className="md:col-span-2 font-medium">Add a draft goal</p>
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
        <button className="rounded-md bg-[#1f6f64] text-white px-4 py-2">Save draft</button>
      </form>

      <ul className="mt-8 space-y-3">
        {own.map((g) => {
          const editable = goalPlanEditable(g.status);
          return (
            <li key={g.id} className="rounded-xl border border-[#d8cfc0] bg-white p-4">
              <div className="flex flex-wrap justify-between gap-2">
                <p className="text-xs uppercase tracking-wide text-[#c24e1d]">{GOAL_CATEGORY[g.category]}</p>
                <p className="text-sm">{GOAL_STATUS[g.status] ?? g.status}</p>
              </div>
              {editable ? (
                <form action={updateGoalPlan} className="mt-3 space-y-3">
                  <input type="hidden" name="id" value={g.id} />
                  <input name="title" defaultValue={g.title} className="w-full rounded-md border border-[#d8cfc0] px-3 py-2 font-medium" />
                  <textarea name="description" defaultValue={g.description} className="w-full rounded-md border border-[#d8cfc0] px-3 py-2 min-h-16 text-sm" />
                  <textarea name="successCriteria" defaultValue={g.successCriteria} className="w-full rounded-md border border-[#d8cfc0] px-3 py-2 min-h-14 text-sm" />
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
                    <button className="text-sm text-[#c24e1d]">Save plan</button>
                  </div>
                </form>
              ) : (
                <div className="mt-2">
                  <p className="font-medium">{g.title}</p>
                  <p className="text-sm text-[#3d4f56] mt-1">{g.description}</p>
                </div>
              )}
              {(g.status === GOAL_STATES.draft || g.status === GOAL_STATES.sent_back) ? (
                <form action={submitGoal} className="mt-3">
                  <input type="hidden" name="id" value={g.id} />
                  <button className="rounded-md bg-[#162329] text-white px-3 py-1.5 text-sm">Submit for approval</button>
                </form>
              ) : null}
            </li>
          );
        })}
      </ul>

      {pendingApproval.length > 0 ? (
        <section className="mt-12">
          <h2 className="serif text-2xl">Waiting on you</h2>
          <ul className="mt-4 space-y-2">
            {pendingApproval.map((g) => (
              <li key={g.id} className="rounded-xl border border-[#d8cfc0] bg-white p-4">
                <p className="font-medium">
                  {g.employee.firstName} {g.employee.lastName} · {g.title}
                </p>
                <p className="text-sm text-[#3d4f56] mt-1">{g.description}</p>
                <div className="mt-3 flex gap-2">
                  <form action={decideGoal}>
                    <input type="hidden" name="id" value={g.id} />
                    <input type="hidden" name="decision" value="approved" />
                    <button className="rounded-md bg-[#1f6f64] text-white px-3 py-1.5 text-sm">Approve</button>
                  </form>
                  <form action={decideGoal}>
                    <input type="hidden" name="id" value={g.id} />
                    <input type="hidden" name="decision" value="sent_back" />
                    <button className="rounded-md border border-[#c24e1d] text-[#c24e1d] px-3 py-1.5 text-sm">Send back</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {team.length > 0 ? (
        <section className="mt-12">
          <h2 className="serif text-2xl">{access.role === ROLES.hr_admin ? "Company plans" : "Team plans"}</h2>
          <ul className="mt-4 divide-y divide-[#d8cfc0] rounded-xl border border-[#d8cfc0] bg-white">
            {team.map((g) => (
              <li key={g.id} className="px-4 py-3 flex justify-between gap-3 text-sm">
                <span>
                  <span className="font-medium">
                    {g.employee.firstName} {g.employee.lastName}
                  </span>
                  <span className="text-[#3d4f56]"> · {g.title}</span>
                </span>
                <span>
                  {GOAL_STATUS[g.status]} · {g.weight}%
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
