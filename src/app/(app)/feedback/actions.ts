"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { emailFeedbackReceived } from "@/lib/email";
import { fullName } from "@/lib/format";

export async function sendFeedback(formData: FormData) {
  const ctx = await requireSession();
  if (!ctx) redirect("/sign-in");
  const toId = String(formData.get("toId") || "");
  const message = String(formData.get("message") || "").trim();
  const type = String(formData.get("type") || "PRAISE");
  if (!toId || !message || toId === ctx.user.id) return;
  await prisma.feedback.create({
    data: { fromId: ctx.user.id, toId, type, message },
  });
  const to = await prisma.user.findUnique({
    where: { id: toId },
    include: { employee: true },
  });
  if (to) {
    await emailFeedbackReceived({
      toEmail: to.email,
      toName: fullName(to.employee) || to.email,
      fromName: ctx.session.name,
      type,
      message,
    });
  }
  revalidatePath("/feedback");
}
