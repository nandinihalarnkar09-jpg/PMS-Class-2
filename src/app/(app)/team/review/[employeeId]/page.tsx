import { supabaseServer } from "@/lib/supabase";
import { requireEmployee } from "@/lib/current-employee";
import { completeTeamReview } from "./actions";

export const dynamic = "force-dynamic";

const RATING_LABEL: Record<number, string> = {
  1: "Unsatisfactory",
  2: "Developing",
  3: "Meets",
  4: "Exceeds",
  5: "Outstanding",
};

const field = "mt-1 w-full rounded-md border border-[#d8cfc0] bg-white px-3 py-2 text-sm";

function ratingText(value: number | null) {
  if (value == null) return "—";
  const rounded = Math.round(value);
  return `${value}${RATING_LABEL[rounded] ? ` · ${RATING_LABEL[rounded]}` : ""}`;
}

export default async function TeamReviewPage({ params }: { params: Promise<{ employeeId: string }> }) {
  const me = await requireEmployee();
  const { employeeId } = await params;

  const { data: report } = await supabaseServer()
    .from("employees")
    .select("id, full_name, designation, manager_id")
    .eq("id", employeeId)
    .maybeSingle();

  if (!report) {
    return <p className="text-sm text-[#3d4f56]">That employee was not found.</p>;
  }

  const allowedByRole = me.role === "hr_admin";
  const allowedAsManager = report.manager_id === me.id;
  if (!allowedByRole && !allowedAsManager) {
    return <p className="text-sm text-[#3d4f56]">You can only review people who report to you.</p>;
  }

  const { data: cycle } = await supabaseServer()
    .from("review_cycles")
    .select("id, name, start_date, end_date")
    .eq("status", "open")
    .limit(1)
    .maybeSingle();

  if (!cycle) {
    return (
      <div>
        <h1 className="serif text-4xl">Team Review</h1>
        <p className="mt-8 text-sm text-[#3d4f56]">No open review cycle.</p>
      </div>
    );
  }

  const { data: review } = await supabaseServer()
    .from("reviews")
    .select("id, employee_id, manager_id, status, manager_summary, overall_manager_rating")
    .eq("employee_id", report.id)
    .eq("cycle_id", cycle.id)
    .maybeSingle();

  if (review && me.role !== "hr_admin" && review.manager_id !== me.id) {
    return <p className="text-sm text-[#3d4f56]">You can only review people who report to you.</p>;
  }

  const waiting = !review || review.status !== "self_appraisal_submitted";
  const alreadyDone = review?.status === "completed" || review?.status === "manager_reviewed";

  const { data: goalRows } = await supabaseServer()
    .from("goals")
    .select("id, title, description, weightage")
    .eq("employee_id", report.id)
    .eq("cycle_id", cycle.id)
    .eq("status", "approved")
    .order("created_at", { ascending: true });

  const goals = goalRows ?? [];

  const { data: ratingRows } = review
    ? await supabaseServer()
        .from("goal_ratings")
        .select("goal_id, self_comment, self_rating, manager_comment, manager_rating")
        .eq("review_id", review.id)
    : { data: [] };

  const ratings = new Map(
    (ratingRows ?? []).map((row) => [
      row.goal_id as string,
      {
        self_comment: String(row.self_comment ?? ""),
        self_rating: row.self_rating == null ? null : Number(row.self_rating),
        manager_comment: String(row.manager_comment ?? ""),
        manager_rating: row.manager_rating == null ? null : Number(row.manager_rating),
      },
    ]),
  );

  return (
    <div>
      <h1 className="serif text-4xl">Team Review</h1>
      <p className="mt-2 text-sm text-[#3d4f56]">
        {report.full_name} · {report.designation}
      </p>
      <p className="mt-1 text-sm text-[#3d4f56]">
        {cycle.name} · {cycle.start_date} → {cycle.end_date}
      </p>

      {alreadyDone ? (
        <div className="mt-8 rounded-xl border border-dashed border-[#d8cfc0] bg-white px-6 py-16 text-center">
          <p className="font-medium text-[#162329]">This review is already completed</p>
          <p className="mt-2 text-sm text-[#3d4f56]">Manager ratings for this cycle have been saved.</p>
        </div>
      ) : waiting ? (
        <div className="mt-8 rounded-xl border border-dashed border-[#d8cfc0] bg-white px-6 py-16 text-center">
          <p className="font-medium text-[#162329]">Waiting for self-appraisal</p>
          <p className="mt-2 text-sm text-[#3d4f56]">
            {report.full_name} has not submitted a self-appraisal for this cycle yet.
          </p>
        </div>
      ) : (
        <form action={completeTeamReview} className="mt-8 space-y-6">
          <input type="hidden" name="employee_id" value={report.id} />
          {goals.map((goal) => {
            const saved = ratings.get(goal.id);
            return (
              <section key={goal.id} className="rounded-xl border border-[#d8cfc0] bg-white p-4">
                <h2 className="font-medium">{goal.title}</h2>
                <p className="text-sm text-[#3d4f56]">
                  Weightage {goal.weightage}%
                  {goal.description ? ` · ${goal.description}` : ""}
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-md bg-[#f4efe6] p-3">
                    <p className="text-xs uppercase tracking-wide text-[#3d4f56]">Employee</p>
                    <p className="mt-2 text-sm whitespace-pre-wrap">{saved?.self_comment || "—"}</p>
                    <p className="mt-2 text-sm text-[#3d4f56]">Self-rating: {ratingText(saved?.self_rating ?? null)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[#3d4f56]">Manager</p>
                    <label className="mt-2 block text-sm text-[#3d4f56]">
                      Comment
                      <textarea
                        className={`${field} min-h-24`}
                        name={`manager_comment_${goal.id}`}
                        required
                        defaultValue={saved?.manager_comment ?? ""}
                      />
                    </label>
                    <label className="mt-3 block text-sm text-[#3d4f56]">
                      Rating (1–5)
                      <select
                        className={field}
                        name={`manager_rating_${goal.id}`}
                        required
                        defaultValue={saved?.manager_rating ? String(Math.round(saved.manager_rating)) : ""}
                      >
                        <option value="">Select a rating</option>
                        <option value="1">1 — Unsatisfactory</option>
                        <option value="2">2 — Developing</option>
                        <option value="3">3 — Meets</option>
                        <option value="4">4 — Exceeds</option>
                        <option value="5">5 — Outstanding</option>
                      </select>
                    </label>
                  </div>
                </div>
              </section>
            );
          })}

          <div className="rounded-xl border border-[#d8cfc0] bg-white p-4">
            <label className="block text-sm text-[#3d4f56]">
              Overall manager rating (1–5)
              <select className={field} name="overall_manager_rating" required>
                <option value="">Select a rating</option>
                <option value="1">1 — Unsatisfactory</option>
                <option value="2">2 — Developing</option>
                <option value="3">3 — Meets</option>
                <option value="4">4 — Exceeds</option>
                <option value="5">5 — Outstanding</option>
              </select>
            </label>
            <label className="mt-4 block text-sm text-[#3d4f56]">
              Manager summary
              <textarea className={`${field} min-h-28`} name="manager_summary" required />
            </label>
          </div>

          <button type="submit" className="rounded-md bg-[#1f6f64] px-4 py-2 text-sm text-white">
            Complete Review
          </button>
        </form>
      )}
    </div>
  );
}
