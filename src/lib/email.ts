import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const from = process.env.RESEND_FROM || "Helix PMS <noreply@helix.consulting>";
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function send(to: string, subject: string, html: string) {
  if (!resend) {
    console.info(`[email skipped] ${subject} → ${to}`);
    return;
  }
  const { error } = await resend.emails.send({ from, to, subject, html });
  if (error) console.error("Resend error", error);
}

export async function emailFeedbackReceived(opts: {
  toEmail: string;
  toName: string;
  fromName: string;
  type: string;
  message: string;
}) {
  await send(
    opts.toEmail,
    `${opts.fromName} left you ${opts.type.toLowerCase()} feedback`,
    `<p>Hi ${opts.toName},</p>
     <p><strong>${opts.fromName}</strong> sent ${opts.type.toLowerCase()} feedback on Helix PMS:</p>
     <blockquote style="border-left:3px solid #c24e1d;padding-left:12px;color:#162329">${opts.message}</blockquote>
     <p><a href="${appUrl}/feedback">Open feedback</a></p>`,
  );
}

export async function emailReviewEvent(opts: {
  toEmail: string;
  toName: string;
  subject: string;
  body: string;
  reviewId: string;
}) {
  await send(
    opts.toEmail,
    opts.subject,
    `<p>Hi ${opts.toName},</p><p>${opts.body}</p><p><a href="${appUrl}/reviews/${opts.reviewId}">Open review packet</a></p>`,
  );
}
