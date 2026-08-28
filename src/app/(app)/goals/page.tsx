import { supabaseServer } from "@/lib/supabase";
import { requireEmployee } from "@/lib/current-employee";
import { addGoal, deleteGoal, submitAllGoals, updateGoal, type GoalRow } from "./actions";

export const dynamic = "force-dynamic";

function weightTotal(rows: GoalRow[]) {
  return Math.round(rows.reduce((sum, row) => sum + Number(row.weightage), 0) * 100) / 100;
}

export default async function GoalsPage() {
  const me = await requireEmployee();
  const { data: cycle } = await supabaseServer()
    .from("review_cycles")
    .select("id, name, start_date, end_date")
    .eq("status", "open")
    .limit(1)
    .maybeSingle();

  if (!cycle) {
    return (
      <div>
        <h1 className="serif text-4xl">My Goals</h1>
        <div className="mt-8 rounded-xl border border-dashed border-[#d8cfc0] bg-white px-6 py-16 text-center">
          <p className="font-medium text-[#162329]">No open review cycle</p>
          <p className="mt-2 text-sm text-[#3d4f56]">
            HR needs to open a cycle before you can add goals. Check back when a cycle is open.
          </p>
        </div>
      </div>
    );
  }

  const { data } = await supabaseServer()
    .from("goals")
    .select("id, employee_id, cycle_id, title, description, weightage, target_date, status, manager_comment")
    .eq("employee_id", me.id)
    .eq("cycle_id", cycle.id)
    .order("created_at", { ascending: true })
    .returns<GoalRow[]>();

  const goals = data ?? [];
  const total = weightTotal(goals);
  const totalOk = total === 100;
  const field = "mt-1 w-full rounded-md border border-[#d8cfc0] bg-white px-3 py-2 text-sm";

  return (
    <div>
      <h1 className="serif text-4xl">My Goals</h1>
      <p className="mt-2 text-sm text-[#3d4f56]">
        {cycle.name} · {cycle.start_date} → {cycle.end_date}
      </p>
      <p className={`mt-4 text-lg font-medium ${totalOk ? "text-[#162329]" : "text-red-700"}`}>
        Weightage total: {total}%{totalOk ? "" : " — must equal 100% to submit"}
      </p>

      <form action={addGoal} className="mt-8 rounded-xl border border-[#d8cfc0] bg-white p-5">
        <h2 className="font-medium">Add a goal</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-[#3d4f56] sm:col-span-2">
            Title
            <input className={field} name="title" required />
          </label>
          <label className="text-sm text-[#3d4f56] sm:col-span-2">
            Description
            <textarea className={`${field} min-h-20`} name="description" />
          </label>
          <label className="text-sm text-[#3d4f56]">
            Weightage
            <input className={field} name="weightage" type="number" min={1} max={100} step="0.01" required />
          </label>
          <label className="text-sm text-[#3d4f56]">
            Target date
            <input className={field} name="target_date" type="date" />
          </label>
        </div>
        <button type="submit" className="mt-4 rounded-md bg-[#162329] px-4 py-2 text-sm text-[#f4efe6]">
          Add draft
        </button>
      </form>

      <form action={submitAllGoals} className="mt-6">
        <button
          type="submit"
          disabled={!totalOk}
          className="rounded-md bg-[#1f6f64] px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Submit All Goals
        </button>
      </form>

      {goals.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-[#d8cfc0] bg-white px-6 py-12 text-center">
          <p className="font-medium">No goals yet</p>
          <p className="mt-2 text-sm text-[#3d4f56]">Add draft goals until the weightage total is 100%.</p>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {goals.map((goal) => (
            <li key={goal.id} className="rounded-xl border border-[#d8cfc0] bg-white p-4">
              {goal.status === "draft" || goal.status === "sent_back" ? (
                <form action={updateGoal} className="space-y-3">
                  <input type="hidden" name="id" value={goal.id} />
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="uppercase tracking-wide text-[#c24e1d]">{goal.status}</span>
                    <span>{goal.weightage}%</span>
                  </div>
                  {goal.status === "sent_back" && goal.manager_comment ? (
                    <p className="rounded-md bg-[#f8e8e0] px-3 py-2 text-sm text-[#5a2410]">
                      Manager: {goal.manager_comment}
                    </p>
                  ) : null}
                  <input className={field} name="title" defaultValue={goal.title} />
                  <textarea className={`${field} min-h-16`} name="description" defaultValue={goal.description ?? ""} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm text-[#3d4f56]">
                      Weightage
                      <input
                        className={field}
                        name="weightage"
                        type="number"
                        min={1}
                        max={100}
                        step="0.01"
                        defaultValue={goal.weightage}
                      />
                    </label>
                    <label className="text-sm text-[#3d4f56]">
                      Target date
                      <input className={field} name="target_date" type="date" defaultValue={goal.target_date ?? ""} />
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="submit" className="rounded-md bg-[#162329] px-3 py-1.5 text-sm text-[#f4efe6]">
                      Save
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{goal.title}</p>
                    <p className="text-sm text-[#3d4f56]">
                      {goal.status} · {goal.weightage}%
                      {goal.target_date ? ` · ${goal.target_date}` : ""}
                    </p>
                  </div>
                  {goal.description ? <p className="mt-2 text-sm text-[#3d4f56]">{goal.description}</p> : null}
                </div>
              )}
              {goal.status === "draft" ? (
                <form action={deleteGoal} className="mt-3">
                  <input type="hidden" name="id" value={goal.id} />
                  <button type="submit" className="text-sm text-red-800">
                    Delete
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
