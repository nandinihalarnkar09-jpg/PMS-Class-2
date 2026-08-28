import { supabaseServer } from "@/lib/supabase";
import { requireEmployee } from "@/lib/current-employee";
import { SelfAppraisalForm, type AppraisalGoal } from "./self-appraisal-form";

export const dynamic = "force-dynamic";

const RATING_LABEL: Record<number, string> = {
  1: "Unsatisfactory",
  2: "Developing",
  3: "Meets",
  4: "Exceeds",
  5: "Outstanding",
};

export default async function MyReviewPage() {
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
        <h1 className="serif text-4xl">My Review</h1>
        <div className="mt-8 rounded-xl border border-dashed border-[#d8cfc0] bg-white px-6 py-16 text-center">
          <p className="font-medium text-[#162329]">No open review cycle</p>
          <p className="mt-2 text-sm text-[#3d4f56]">HR needs to open a cycle before you can submit a self-appraisal.</p>
        </div>
      </div>
    );
  }

  const { data: goalRows } = await supabaseServer()
    .from("goals")
    .select("id, title, description, weightage")
    .eq("employee_id", me.id)
    .eq("cycle_id", cycle.id)
    .eq("status", "approved")
    .order("created_at", { ascending: true });

  const approved = goalRows ?? [];

  const { data: review } = await supabaseServer()
    .from("reviews")
    .select("id, status, submitted_at")
    .eq("employee_id", me.id)
    .eq("cycle_id", cycle.id)
    .maybeSingle();

  const locked = Boolean(review && review.status !== "not_started");

  const { data: ratingRows } = review
    ? await supabaseServer()
        .from("goal_ratings")
        .select("goal_id, self_comment, self_rating")
        .eq("review_id", review.id)
    : { data: [] };

  const ratingByGoal = new Map(
    (ratingRows ?? []).map((row) => [
      row.goal_id as string,
      { comment: String(row.self_comment ?? ""), rating: row.self_rating == null ? null : Number(row.self_rating) },
    ]),
  );

  const goals: AppraisalGoal[] = approved.map((goal) => {
    const saved = ratingByGoal.get(goal.id);
    return {
      id: goal.id,
      title: goal.title,
      description: goal.description,
      weightage: Number(goal.weightage),
      self_comment: saved?.comment ?? "",
      self_rating: saved?.rating ?? null,
    };
  });

  return (
    <div>
      <h1 className="serif text-4xl">My Review</h1>
      <p className="mt-2 text-sm text-[#3d4f56]">
        {cycle.name} · {cycle.start_date} → {cycle.end_date}
      </p>
      <p className="mt-2 text-sm text-[#3d4f56]">Self-ratings use a 1–5 scale (1 Unsatisfactory through 5 Outstanding).</p>

      {approved.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-[#d8cfc0] bg-white px-6 py-16 text-center">
          <p className="font-medium text-[#162329]">No approved goals yet</p>
          <p className="mt-2 text-sm text-[#3d4f56]">
            Your manager needs to approve your plan before you can write a self-appraisal.
          </p>
        </div>
      ) : !me.manager_id ? (
        <div className="mt-8 rounded-xl border border-dashed border-[#d8cfc0] bg-white px-6 py-16 text-center">
          <p className="font-medium text-[#162329]">No manager on your employee record</p>
          <p className="mt-2 text-sm text-[#3d4f56]">Ask HR to assign a manager before you submit.</p>
        </div>
      ) : locked ? (
        <div className="mt-8 space-y-4">
          <p className="rounded-md bg-[#e8f0ee] px-3 py-2 text-sm text-[#162329]">
            Submitted
            {review?.submitted_at ? ` on ${new Date(review.submitted_at).toLocaleString()}` : ""}. You cannot edit this
            unless your manager sends it back.
          </p>
          {goals.map((goal) => (
            <div key={goal.id} className="rounded-xl border border-[#d8cfc0] bg-white p-4">
              <p className="font-medium">{goal.title}</p>
              <p className="text-sm text-[#3d4f56]">Weightage {goal.weightage}%</p>
              <p className="mt-3 text-sm whitespace-pre-wrap">{goal.self_comment || "—"}</p>
              <p className="mt-2 text-sm text-[#3d4f56]">
                Self-rating: {goal.self_rating ?? "—"}
                {goal.self_rating ? ` · ${RATING_LABEL[Math.round(goal.self_rating)] ?? ""}` : ""}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <SelfAppraisalForm goals={goals} />
      )}
    </div>
  );
}
