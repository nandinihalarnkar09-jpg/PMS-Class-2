import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CLERK_WEBHOOK_SECRET missing" }, { status: 500 });
  }

  const headerList = await headers();
  const svixId = headerList.get("svix-id");
  const svixTimestamp = headerList.get("svix-timestamp");
  const svixSignature = headerList.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing Svix headers" }, { status: 400 });
  }

  const payload = await req.text();
  let event: { type: string; data: { id: string; email_addresses?: { email_address: string }[] } };
  try {
    event = new Webhook(secret).verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as typeof event;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "user.created" || event.type === "user.updated") {
    const email = event.data.email_addresses?.[0]?.email_address.toLowerCase();
    if (!email) return NextResponse.json({ ok: true });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { clerkId: event.data.id },
      });
    } else {
      await prisma.user.create({
        data: { clerkId: event.data.id, email, role: "EMPLOYEE" },
      });
    }
  }

  if (event.type === "user.deleted") {
    await prisma.user.updateMany({
      where: { clerkId: event.data.id },
      data: { clerkId: null },
    });
  }

  return NextResponse.json({ ok: true });
}
