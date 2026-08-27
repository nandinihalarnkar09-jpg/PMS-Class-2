import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, canManagePeople } from "@/lib/auth";
import { fullName } from "@/lib/format";
import { GOAL_CATEGORY, RATING_BANDS, REVIEW_STATUS, ratingBand } from "@/lib/labels";
import { displayOutcome, weightedScore } from "@/lib/outcomes";
import { acknowledgeReview, calibrateReview, ensureGoalRatings, saveManagerReview, saveSelfReview } from "../actions";

export default async function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireSession();
  if (!ctx) redirect("/sign-in");
  const { id } = await params;
  await ensureGoalRatings(id);
  const review = await prisma.review.findUnique({
    where: { id },
    include: {
      cycle: true,
      employee: { include: { department: true } },
      reviewer: true,
      goalRatings: { include: { goal: true }, orderBy: { goal: { category: "asc" } } },
    },
  });
  if (!review) notFound();

  const isSubject = review.employeeId === ctx.user.employee?.id;
  const isReviewer = review.reviewerId === ctx.user.employee?.id;
  const hr = canManagePeople(ctx.user.role);
  if (!isSubject && !isReviewer && !hr) {
    return <p>You do not have access to this review packet.</p>;
  }

  const outcome = displayOutcome(review.goalRatings, review.finalRating);
  const band = ratingBand(outcome);
  const selfOpen = review.status === "NOT_STARTED" || review.status === "SELF_IN_PROGRESS" || !review.selfSummary;

  return (
    <div>
      <Link href="/reviews" className="text-sm text-[#1f6f64]">
        ← Reviews
      </Link>
      <h1 className="serif text-4xl mt-3">{fullName(review.employee)}</h1>
      <p className="text-[#3d4f56] mt-1">
        {review.employee.title} · {review.employee.department.name} · {review.cycle.name}
      </p>
      <p className="mt-2 text-sm">
        Status: <span className="font-medium">{REVIEW_STATUS[review.status]}</span>
        {band ? ` · ${band.label}` : ""}
        {review.reviewer ? ` · Manager ${fullName(review.reviewer)}` : ""}
        {weightedScore(review.goalRatings, "selfScore") != null
          ? ` · self ${weightedScore(review.goalRatings, "selfScore")}`
          : ""}
        {weightedScore(review.goalRatings, "managerScore") != null
          ? ` · manager ${weightedScore(review.goalRatings, "managerScore")}`
          : ""}
      </p>

      <div className="mt-6 flex flex-wrap gap-2 text-xs">
        {RATING_BANDS.map((b) => (
          <span key={b.label} className="rounded-full border border-[#d8cfc0] bg-white px-3 py-1">
            {b.min}+ {b.label}
          </span>
        ))}
      </div>

      <section className="mt-8 rounded-xl border border-[#d8cfc0] bg-white p-5">
        <h2 className="serif text-2xl">Goal ratings</h2>
        <p className="text-sm text-[#3d4f56] mt-1">
          Plan text is read-only here. Scores are the outcome for this review.
        </p>
        <ul className="mt-4 space-y-4">
          {review.goalRatings.map((row) => (
            <li key={row.id} className="border border-[#ebe4d6] rounded-lg p-3">
              <p className="text-xs uppercase tracking-wide text-[#c24e1d]">{GOAL_CATEGORY[row.goal.category]} · {row.goal.weight}%</p>
              <p className="font-medium mt-1">{row.goal.title}</p>
              <p className="text-sm text-[#3d4f56] mt-1">{row.goal.description}</p>
              {row.goal.successCriteria ? (
                <p className="text-xs text-[#3d4f56] mt-1">Done when: {row.goal.successCriteria}</p>
              ) : null}
              <p className="text-xs mt-2">
                Self {row.selfScore ?? "—"} · Manager {row.managerScore ?? "—"} · Final {row.finalScore ?? "—"}
              </p>
              {row.selfComment ? <p className="text-sm mt-1">{row.selfComment}</p> : null}
              {row.managerComment && ["MANAGER_SUBMITTED", "CALIBRATED", "ACKNOWLEDGED"].includes(review.status) ? (
                <p className="text-sm mt-1 text-[#3d4f56]">{row.managerComment}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {isSubject ? (
        <section className="mt-8 rounded-xl border border-[#d8cfc0] bg-white p-5">
          <h2 className="serif text-2xl">Self-review</h2>
          {selfOpen ? (
            <form action={saveSelfReview} className="mt-4 space-y-4">
              <input type="hidden" name="id" value={review.id} />
              {review.goalRatings.map((row) => (
                <fieldset key={row.id} className="border border-[#ebe4d6] rounded-lg p-3">
                  <legend className="px-1 text-sm font-medium">{row.goal.title}</legend>
                  <label className="block text-sm mt-2">
                    Score (1–5)
                    <input
                      name={`selfScore_${row.id}`}
                      type="number"
                      min={1}
                      max={5}
                      step={0.1}
                      defaultValue={row.selfScore ?? 3}
                      className="ml-2 w-24 rounded-md border border-[#d8cfc0] px-2 py-1"
                    />
                  </label>
                  <textarea
                    name={`selfComment_${row.id}`}
                    defaultValue={row.selfComment}
                    placeholder="Evidence against this goal"
                    className="mt-2 w-full min-h-16 rounded-md border border-[#d8cfc0] px-3 py-2 text-sm"
                  />
                </fieldset>
              ))}
              <textarea
                name="selfSummary"
                defaultValue={review.selfSummary}
                className="w-full min-h-28 rounded-md border border-[#d8cfc0] px-3 py-2"
                placeholder="Overall narrative — not a substitute for per-goal scores."
              />
              <div className="flex gap-2">
                <button name="intent" value="save" className="rounded-md border border-[#162329] px-4 py-2">
                  Save draft
                </button>
                <button name="intent" value="submit" className="rounded-md bg-[#c24e1d] text-white px-4 py-2">
                  Submit to manager
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-3">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{review.selfSummary}</p>
              {review.status === "CALIBRATED" ? (
                <form action={acknowledgeReview} className="mt-4">
                  <input type="hidden" name="id" value={review.id} />
                  <button className="rounded-md bg-[#1f6f64] text-white px-4 py-2">Acknowledge outcome</button>
                </form>
              ) : null}
            </div>
          )}
        </section>
      ) : (
        <section className="mt-8 rounded-xl border border-[#d8cfc0] bg-white p-5">
          <h2 className="serif text-2xl">Self-review</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{review.selfSummary || "Not submitted yet."}</p>
        </section>
      )}

      {isReviewer || hr ? (
        <section className="mt-8 rounded-xl border border-[#d8cfc0] bg-white p-5">
          <h2 className="serif text-2xl">Manager write-up</h2>
          <form action={saveManagerReview} className="mt-4 space-y-4">
            <input type="hidden" name="id" value={review.id} />
            {review.goalRatings.map((row) => (
              <fieldset key={row.id} className="border border-[#ebe4d6] rounded-lg p-3">
                <legend className="px-1 text-sm font-medium">{row.goal.title}</legend>
                <label className="block text-sm mt-2">
                  Score (1–5)
                  <input
                    name={`managerScore_${row.id}`}
                    type="number"
                    min={1}
                    max={5}
                    step={0.1}
                    defaultValue={row.managerScore ?? row.selfScore ?? 3}
                    className="ml-2 w-24 rounded-md border border-[#d8cfc0] px-2 py-1"
                  />
                </label>
                <textarea
                  name={`managerComment_${row.id}`}
                  defaultValue={row.managerComment}
                  placeholder="Manager evidence"
                  className="mt-2 w-full min-h-16 rounded-md border border-[#d8cfc0] px-3 py-2 text-sm"
                />
              </fieldset>
            ))}
            <textarea
              name="managerSummary"
              defaultValue={review.managerSummary}
              className="w-full min-h-28 rounded-md border border-[#d8cfc0] px-3 py-2"
              placeholder="Overall manager narrative."
            />
            <div className="flex gap-2">
              <button name="intent" value="save" className="rounded-md border border-[#162329] px-4 py-2">
                Save draft
              </button>
              <button name="intent" value="submit" className="rounded-md bg-[#162329] text-white px-4 py-2">
                Submit for calibration
              </button>
            </div>
          </form>
        </section>
      ) : (
        <section className="mt-8 rounded-xl border border-[#d8cfc0] bg-white p-5">
          <h2 className="serif text-2xl">Manager write-up</h2>
          <p className="mt-3 text-sm whitespace-pre-wrap">
            {["MANAGER_SUBMITTED", "CALIBRATED", "ACKNOWLEDGED"].includes(review.status)
              ? review.managerSummary
              : "Your manager has not released this write-up yet."}
          </p>
        </section>
      )}

      {hr ? (
        <section className="mt-8 rounded-xl border border-[#d8cfc0] bg-white p-5">
          <h2 className="serif text-2xl">HR calibration</h2>
          <form action={calibrateReview} className="mt-4 space-y-4">
            <input type="hidden" name="id" value={review.id} />
            {review.goalRatings.map((row) => (
              <label key={row.id} className="block text-sm">
                {row.goal.title}
                <input
                  name={`finalScore_${row.id}`}
                  type="number"
                  min={1}
                  max={5}
                  step={0.1}
                  defaultValue={row.finalScore ?? row.managerScore ?? 3}
                  className="ml-2 w-24 rounded-md border border-[#d8cfc0] px-2 py-1"
                />
              </label>
            ))}
            <label className="block text-sm">
              Overall final rating (leave blank to use weighted goal_ratings)
              <input
                name="finalRating"
                type="number"
                min={1}
                max={5}
                step={0.1}
                defaultValue={review.finalRating ?? weightedScore(review.goalRatings, "managerScore") ?? 3}
                className="ml-2 w-24 rounded-md border border-[#d8cfc0] px-2 py-1"
              />
            </label>
            <textarea
              name="hrNotes"
              defaultValue={review.hrNotes}
              placeholder="Calibration notes (visible to HR/admin)"
              className="w-full min-h-24 rounded-md border border-[#d8cfc0] px-3 py-2"
            />
            <button className="rounded-md bg-[#c24e1d] text-white px-4 py-2">Lock calibrated rating</button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
