"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAccess } from "@/lib/auth";
import { emailFeedbackReceived } from "@/lib/email";
import { fullName } from "@/lib/format";

export async function sendFeedback(formData: FormData) {
  const access = await requireAccess();
  const toId = String(formData.get("toId") || "");
  const message = String(formData.get("message") || "").trim();
  const type = String(formData.get("type") || "PRAISE");
  if (!toId || !message || toId === access.userId) return;
  const recipient = await prisma.user.findUnique({
    where: { id: toId },
    include: { employee: true },
  });
  if (!recipient?.employee) return;
  await prisma.feedback.create({
    data: { fromId: access.userId, toId: recipient.id, type, message },
  });
  await emailFeedbackReceived({
    toEmail: recipient.email,
    toName: fullName(recipient.employee) || recipient.email,
    fromName: access.name,
    type,
    message,
  });
  revalidatePath("/feedback");
}
