import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { FEEDBACK_TYPE } from "@/lib/labels";
import { formatDate, fullName } from "@/lib/format";
import { sendFeedback } from "./actions";

export default async function FeedbackPage() {
  const ctx = await requireSession();
  if (!ctx) redirect("/sign-in");

  const [inbox, sent, colleagues] = await Promise.all([
    prisma.feedback.findMany({
      where: { toId: ctx.user.id },
      include: { from: { include: { employee: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.feedback.findMany({
      where: { fromId: ctx.user.id },
      include: { to: { include: { employee: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.employee.findMany({
      where: { userId: { not: ctx.user.id } },
      include: { user: true },
      orderBy: { lastName: "asc" },
      take: 80,
    }),
  ]);

  return (
    <div>
      <h1 className="serif text-4xl">Feedback</h1>
      <p className="mt-2 text-[#3d4f56]">
        Continuous notes sit beside the annual packet. Praise, coaching, and peer observations are all first-class.
      </p>

      <form action={sendFeedback} className="mt-8 rounded-xl border border-[#d8cfc0] bg-white p-4 space-y-3">
        <p className="font-medium">Write a note</p>
        <select name="toId" required className="w-full rounded-md border border-[#d8cfc0] px-3 py-2">
          <option value="">Choose a colleague</option>
          {colleagues.map((c) => (
            <option key={c.userId} value={c.userId}>
              {fullName(c)} · {c.title}
            </option>
          ))}
        </select>
        <select name="type" className="w-full rounded-md border border-[#d8cfc0] px-3 py-2">
          {Object.entries(FEEDBACK_TYPE).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <textarea name="message" required minLength={8} placeholder="Be specific. Name the work." className="w-full min-h-28 rounded-md border border-[#d8cfc0] px-3 py-2" />
        <button className="rounded-md bg-[#c24e1d] text-white px-4 py-2">Send</button>
      </form>

      <div className="mt-10 grid lg:grid-cols-2 gap-8">
        <section>
          <h2 className="serif text-2xl">Received</h2>
          <ul className="mt-3 space-y-3">
            {inbox.map((f) => (
              <li key={f.id} className="rounded-xl border border-[#d8cfc0] bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-[#c24e1d]">{FEEDBACK_TYPE[f.type]}</p>
                <p className="mt-2 text-sm leading-relaxed">{f.message}</p>
                <p className="mt-2 text-xs text-[#3d4f56]">
                  {fullName(f.from.employee)} · {formatDate(f.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="serif text-2xl">Sent</h2>
          <ul className="mt-3 space-y-3">
            {sent.map((f) => (
              <li key={f.id} className="rounded-xl border border-[#d8cfc0] bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-[#1f6f64]">{FEEDBACK_TYPE[f.type]}</p>
                <p className="mt-2 text-sm leading-relaxed">{f.message}</p>
                <p className="mt-2 text-xs text-[#3d4f56]">To {fullName(f.to.employee)}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
