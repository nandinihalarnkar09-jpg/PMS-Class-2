import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, isLeader } from "@/lib/auth";
import { GOAL_CATEGORY, GOAL_STATUS } from "@/lib/labels";
import { addGoal, updateGoalProgress } from "./actions";

export default async function GoalsPage() {
  const ctx = await requireSession();
  if (!ctx) redirect("/sign-in");
  const emp = ctx.user.employee;
  if (!emp) return <p>No employee profile linked.</p>;

  const own = await prisma.goal.findMany({
    where: { employeeId: emp.id },
    include: { cycle: true },
    orderBy: { category: "asc" },
  });

  const team =
    isLeader(ctx.user.role)
      ? await prisma.goal.findMany({
          where: { employee: { managerId: emp.id } },
          include: { employee: true, cycle: true },
          take: 30,
          orderBy: { title: "asc" },
        })
      : [];

  return (
    <div>
      <h1 className="serif text-4xl">Goals</h1>
      <p className="mt-2 text-[#3d4f56]">
        Weighted outcomes for the active cycle. Services work uses a mix of utilization, client, and craft goals — not a single KPI.
      </p>

      <form action={addGoal} className="mt-8 rounded-xl border border-[#d8cfc0] bg-white p-4 grid md:grid-cols-2 gap-3">
        <p className="md:col-span-2 font-medium">Add a personal goal</p>
        <input name="title" required placeholder="Title" className="rounded-md border border-[#d8cfc0] px-3 py-2" />
        <select name="category" className="rounded-md border border-[#d8cfc0] px-3 py-2">
          {Object.entries(GOAL_CATEGORY).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <textarea name="description" placeholder="What done looks like" className="md:col-span-2 rounded-md border border-[#d8cfc0] px-3 py-2 min-h-20" />
        <input name="weight" type="number" min={5} max={50} defaultValue={10} className="rounded-md border border-[#d8cfc0] px-3 py-2" />
        <button className="rounded-md bg-[#1f6f64] text-white px-4 py-2">Save goal</button>
      </form>

      <ul className="mt-8 space-y-3">
        {own.map((g) => (
          <li key={g.id} className="rounded-xl border border-[#d8cfc0] bg-white p-4">
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-[#c24e1d]">{GOAL_CATEGORY[g.category]}</p>
                <p className="font-medium mt-1">{g.title}</p>
                <p className="text-sm text-[#3d4f56] mt-1">{g.description}</p>
              </div>
              <p className="text-sm">{g.weight}% weight</p>
            </div>
            <form action={updateGoalProgress} className="mt-4 flex flex-wrap items-end gap-2">
              <input type="hidden" name="id" value={g.id} />
              <label className="text-sm">
                Progress
                <input
                  name="progress"
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={g.progress}
                  className="ml-2 w-20 rounded-md border border-[#d8cfc0] px-2 py-1"
                />
              </label>
              <select name="status" defaultValue={g.status} className="rounded-md border border-[#d8cfc0] px-2 py-1 text-sm">
                {Object.entries(GOAL_STATUS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <button className="text-sm text-[#c24e1d]">Update</button>
            </form>
            <div className="mt-3 h-1.5 rounded-full bg-[#ebe4d6]">
              <div className="h-1.5 rounded-full bg-[#1f6f64]" style={{ width: `${g.progress}%` }} />
            </div>
          </li>
        ))}
      </ul>

      {team.length > 0 ? (
        <section className="mt-12">
          <h2 className="serif text-2xl">Team goals</h2>
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
                  {g.progress}% · {GOAL_STATUS[g.status]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
