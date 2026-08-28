import { NextResponse } from "next/server";
import { Resend } from "resend";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

type NotifyBody = {
  employeeName?: string;
  cycleName?: string;
  reviewId?: string;
  managerEmail?: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function managerReviewHtml(opts: {
  employeeName: string;
  cycleName: string;
  reviewUrl: string;
}) {
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:24px;background:#f4efe6;font-family:Arial,sans-serif;color:#162329">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #d8cfc0;border-radius:12px">
      <tr>
        <td style="padding:24px">
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#3d4f56">Helix PMS</p>
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:500">Self-appraisal submitted</h1>
          <p style="margin:0 0 12px;line-height:1.5">
            <strong>${escapeHtml(opts.employeeName)}</strong> has submitted a self-appraisal for
            <strong>${escapeHtml(opts.cycleName)}</strong>.
          </p>
          <p style="margin:0 0 20px;line-height:1.5">Please add your manager review when you are ready.</p>
          <p style="margin:0">
            <a href="${escapeHtml(opts.reviewUrl)}" style="display:inline-block;background:#162329;color:#f4efe6;text-decoration:none;padding:10px 16px;border-radius:6px;font-size:14px">
              Open manager review
            </a>
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function POST(request: Request) {
  try {
    await auth.protect();

    const body = (await request.json()) as NotifyBody;
    const employeeName = String(body.employeeName ?? "").trim();
    const cycleName = String(body.cycleName ?? "").trim();
    const reviewId = String(body.reviewId ?? "").trim();
    const managerEmail = String(body.managerEmail ?? "").trim();

    if (!employeeName || !cycleName || !reviewId || !managerEmail) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.info("[notify-manager] skipped: RESEND_API_KEY is not set");
      return NextResponse.json({ ok: true, skipped: true });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const reviewUrl = `${appUrl}/reviews/${reviewId}`;
    const from = process.env.RESEND_FROM || "Helix PMS <noreply@helix.consulting>";
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: managerEmail,
      subject: `${employeeName} submitted a self-appraisal`,
      html: managerReviewHtml({ employeeName, cycleName, reviewUrl }),
    });

    if (error) {
      console.error("[notify-manager] Resend error", error);
      return NextResponse.json({ ok: false }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[notify-manager] failed", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
