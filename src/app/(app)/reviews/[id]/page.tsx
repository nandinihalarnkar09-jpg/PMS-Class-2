import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, canManagePeople } from "@/lib/auth";
import { fullName } from "@/lib/format";
import { RATING_BANDS, REVIEW_STATUS, ratingBand } from "@/lib/labels";
import { acknowledgeReview, calibrateReview, saveManagerReview, saveSelfReview } from "../actions";

export default async function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireSession();
  if (!ctx) redirect("/sign-in");
  const { id } = await params;
  const review = await prisma.review.findUnique({
    where: { id },
    include: {
      cycle: true,
      employee: { include: { department: true } },
      reviewer: true,
      competencies: true,
    },
  });
  if (!review) notFound();

  const isSubject = review.employeeId === ctx.user.employee?.id;
  const isReviewer = review.reviewerId === ctx.user.employee?.id;
  const hr = canManagePeople(ctx.user.role);
  if (!isSubject && !isReviewer && !hr) {
    return <p>You do not have access to this review packet.</p>;
  }

  const band = ratingBand(review.finalRating ?? review.managerRating ?? review.selfRating);

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
      </p>

      <div className="mt-6 flex flex-wrap gap-2 text-xs">
        {RATING_BANDS.map((b) => (
          <span key={b.label} className="rounded-full border border-[#d8cfc0] bg-white px-3 py-1">
            {b.min}+ {b.label}
          </span>
        ))}
      </div>

      <section className="mt-8 rounded-xl border border-[#d8cfc0] bg-white p-5">
        <h2 className="serif text-2xl">Competencies</h2>
        <table className="w-full text-sm mt-3">
          <thead className="text-left text-[#3d4f56]">
            <tr>
              <th className="py-2">Skill</th>
              <th>Self</th>
              <th>Manager</th>
            </tr>
          </thead>
          <tbody>
            {review.competencies.map((c) => (
              <tr key={c.id} className="border-t border-[#ebe4d6]">
                <td className="py-2">{c.name}</td>
                <td>{c.selfScore ?? "—"}</td>
                <td>{c.managerScore ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {isSubject ? (
        <section className="mt-8 rounded-xl border border-[#d8cfc0] bg-white p-5">
          <h2 className="serif text-2xl">Self-review</h2>
          {review.status === "NOT_STARTED" || review.status === "SELF_IN_PROGRESS" || !review.selfSummary ? (
            <form action={saveSelfReview} className="mt-4 space-y-3">
              <input type="hidden" name="id" value={review.id} />
              <textarea
                name="selfSummary"
                defaultValue={review.selfSummary}
                className="w-full min-h-32 rounded-md border border-[#d8cfc0] px-3 py-2"
                placeholder="What you delivered, what was hard, what you want next cycle."
              />
              <label className="block text-sm">
                Self rating (1–5)
                <input
                  name="selfRating"
                  type="number"
                  min={1}
                  max={5}
                  step={0.1}
                  defaultValue={review.selfRating ?? 3}
                  className="ml-2 w-24 rounded-md border border-[#d8cfc0] px-2 py-1"
                />
              </label>
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
              <p className="mt-2 text-sm text-[#3d4f56]">Self rating {review.selfRating ?? "—"}</p>
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
          <p className="mt-2 text-sm text-[#3d4f56]">Self rating {review.selfRating ?? "—"}</p>
        </section>
      )}

      {isReviewer || hr ? (
        <section className="mt-8 rounded-xl border border-[#d8cfc0] bg-white p-5">
          <h2 className="serif text-2xl">Manager write-up</h2>
          <form action={saveManagerReview} className="mt-4 space-y-3">
            <input type="hidden" name="id" value={review.id} />
            <textarea
              name="managerSummary"
              defaultValue={review.managerSummary}
              className="w-full min-h-32 rounded-md border border-[#d8cfc0] px-3 py-2"
              placeholder="Evidence, stretch, and what to do next."
            />
            <label className="block text-sm">
              Manager rating (1–5)
              <input
                name="managerRating"
                type="number"
                min={1}
                max={5}
                step={0.1}
                defaultValue={review.managerRating ?? 3}
                className="ml-2 w-24 rounded-md border border-[#d8cfc0] px-2 py-1"
              />
            </label>
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
          <form action={calibrateReview} className="mt-4 space-y-3">
            <input type="hidden" name="id" value={review.id} />
            <label className="block text-sm">
              Final rating
              <input
                name="finalRating"
                type="number"
                min={1}
                max={5}
                step={0.1}
                defaultValue={review.finalRating ?? review.managerRating ?? 3}
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
