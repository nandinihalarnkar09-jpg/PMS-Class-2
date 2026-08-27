"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, canManagePeople } from "@/lib/auth";
import { emailReviewEvent } from "@/lib/email";
import { fullName } from "@/lib/format";

export async function saveSelfReview(formData: FormData) {
  const ctx = await requireSession();
  if (!ctx?.user.employee) redirect("/sign-in");
  const id = String(formData.get("id") || "");
  const review = await prisma.review.findUnique({
    where: { id },
    include: { employee: true, reviewer: { include: { user: true } } },
  });
  if (!review || review.employeeId !== ctx.user.employee.id) return;
  const submit = String(formData.get("intent")) === "submit";
  await prisma.review.update({
    where: { id },
    data: {
      selfSummary: String(formData.get("selfSummary") || ""),
      selfRating: Number(formData.get("selfRating") || 0) || null,
      status: submit ? "SELF_SUBMITTED" : "SELF_IN_PROGRESS",
    },
  });
  if (submit && review.reviewer?.user.email) {
    await emailReviewEvent({
      toEmail: review.reviewer.user.email,
      toName: fullName(review.reviewer),
      subject: `${fullName(review.employee)} submitted a self-review`,
      body: "A self-review is waiting on you in Helix PMS.",
      reviewId: id,
    });
  }
  revalidatePath(`/reviews/${id}`);
  revalidatePath("/reviews");
}

export async function saveManagerReview(formData: FormData) {
  const ctx = await requireSession();
  if (!ctx?.user.employee) redirect("/sign-in");
  const id = String(formData.get("id") || "");
  const review = await prisma.review.findUnique({
    where: { id },
    include: { employee: { include: { user: true } } },
  });
  if (!review) return;
  const allowed = review.reviewerId === ctx.user.employee.id || canManagePeople(ctx.user.role);
  if (!allowed) return;
  const submit = String(formData.get("intent")) === "submit";
  await prisma.review.update({
    where: { id },
    data: {
      managerSummary: String(formData.get("managerSummary") || ""),
      managerRating: Number(formData.get("managerRating") || 0) || null,
      status: submit ? "MANAGER_SUBMITTED" : "MANAGER_IN_PROGRESS",
    },
  });
  if (submit) {
    const hr = await prisma.user.findMany({ where: { role: { in: ["HR", "ADMIN"] } }, take: 5 });
    await Promise.all(
      hr.map((u) =>
        emailReviewEvent({
          toEmail: u.email,
          toName: "People team",
          subject: `Ready for calibration: ${fullName(review.employee)}`,
          body: "A manager review was submitted and is ready for HR calibration.",
          reviewId: id,
        }),
      ),
    );
  }
  revalidatePath(`/reviews/${id}`);
  revalidatePath("/reviews");
}

export async function calibrateReview(formData: FormData) {
  const ctx = await requireSession();
  if (!ctx || !canManagePeople(ctx.user.role)) return;
  const id = String(formData.get("id") || "");
  const review = await prisma.review.update({
    where: { id },
    data: {
      finalRating: Number(formData.get("finalRating") || 0) || null,
      hrNotes: String(formData.get("hrNotes") || ""),
      status: "CALIBRATED",
    },
    include: { employee: { include: { user: true } } },
  });
  await emailReviewEvent({
    toEmail: review.employee.user.email,
    toName: fullName(review.employee),
    subject: "Your Helix appraisal has been calibrated",
    body: "HR has locked your final rating. Open the packet to read comments and acknowledge.",
    reviewId: id,
  });
  revalidatePath(`/reviews/${id}`);
  revalidatePath("/reports");
}

export async function acknowledgeReview(formData: FormData) {
  const ctx = await requireSession();
  if (!ctx?.user.employee) return;
  const id = String(formData.get("id") || "");
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review || review.employeeId !== ctx.user.employee.id) return;
  if (review.status !== "CALIBRATED") return;
  await prisma.review.update({ where: { id }, data: { status: "ACKNOWLEDGED" } });
  revalidatePath(`/reviews/${id}`);
}
