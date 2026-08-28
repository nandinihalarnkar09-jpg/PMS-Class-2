import { supabaseServer } from "@/lib/supabase";
import { requireEmployee } from "@/lib/current-employee";
import { approveGoal, sendBackGoal } from "./actions";

export const dynamic = "force-dynamic";

type SubmittedGoal = {
  id: string;
  employee_id: string;
  title: string;
  description: string | null;
  weightage: number;
  target_date: string | null;
  status: string;
};

type Report = { id: string; full_name: string; designation: string };

export default async function TeamGoalsPage() {
  const me = await requireEmployee();
  if (me.role !== "manager" && me.role !== "hr_admin") {
    return <p className="text-sm text-[#3d4f56]">Team goal review is for managers and HR.</p>;
  }

  const { data: reportRows } = await supabaseServer()
    .from("employees")
    .select("id, full_name, designation")
    .eq("manager_id", me.id)
    .order("full_name");

  const reports = (reportRows ?? []) as Report[];
  const reportIds = reports.map((person) => person.id);

  let goals: SubmittedGoal[] = [];
  if (reportIds.length > 0) {
    const { data } = await supabaseServer()
      .from("goals")
      .select("id, employee_id, title, description, weightage, target_date, status")
      .eq("status", "submitted")
      .in("employee_id", reportIds)
      .order("created_at", { ascending: true });
    goals = (data ?? []) as SubmittedGoal[];
  }

  const byEmployee = reports
    .map((person) => ({
      person,
      goals: goals.filter((goal) => goal.employee_id === person.id),
    }))
    .filter((group) => group.goals.length > 0);

  return (
    <div>
      <h1 className="serif text-4xl">Team Goals</h1>
      <p className="mt-2 text-sm text-[#3d4f56]">Submitted plans from people who report to you.</p>

      {byEmployee.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-[#d8cfc0] bg-white px-6 py-16 text-center">
          <p className="font-medium text-[#162329]">No submitted goals to review</p>
          <p className="mt-2 text-sm text-[#3d4f56]">
            When a direct report submits a plan, it will show up here for approve or send back.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {byEmployee.map(({ person, goals: personGoals }) => (
            <section key={person.id}>
              <h2 className="serif text-2xl">{person.full_name}</h2>
              <p className="text-sm text-[#3d4f56]">{person.designation}</p>
              <ul className="mt-4 space-y-3">
                {personGoals.map((goal) => (
                  <li key={goal.id} className="rounded-xl border border-[#d8cfc0] bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{goal.title}</p>
                        {goal.description ? (
                          <p className="mt-1 text-sm text-[#3d4f56]">{goal.description}</p>
                        ) : null}
                      </div>
                      <p className="text-sm text-[#3d4f56]">
                        {goal.weightage}%
                        {goal.target_date ? ` · ${goal.target_date}` : ""}
                      </p>
                    </div>
                    <div className="mt-4 flex flex-wrap items-start gap-6">
                      <form action={approveGoal}>
                        <input type="hidden" name="id" value={goal.id} />
                        <button type="submit" className="rounded-md bg-[#1f6f64] px-3 py-1.5 text-sm text-white">
                          Approve
                        </button>
                      </form>
                      <form action={sendBackGoal} className="min-w-[16rem] flex-1">
                        <input type="hidden" name="id" value={goal.id} />
                        <label className="text-sm text-[#3d4f56]">
                          Comment
                          <textarea
                            className="mt-1 min-h-16 w-full rounded-md border border-[#d8cfc0] px-3 py-2 text-sm"
                            name="manager_comment"
                            required
                            placeholder="What should they change?"
                          />
                        </label>
                        <button type="submit" className="mt-2 rounded-md border border-[#c24e1d] px-3 py-1.5 text-sm text-[#c24e1d]">
                          Send Back
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
