import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-[#162329] text-[#f4efe6]">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <header className="flex items-center justify-between">
          <p className="serif text-2xl">
            Helix <span className="text-[#e8b59a]">PMS</span>
          </p>
          <div className="flex gap-3 text-sm">
            <Link href="/sign-in" className="rounded-md px-4 py-2 border border-[#d8cfc0]/40">
              Sign in
            </Link>
            <Link href="/sign-up" className="rounded-md px-4 py-2 bg-[#c24e1d]">
              Sign up
            </Link>
          </div>
        </header>
        <section className="mt-24 max-w-2xl">
          <p className="text-xs tracking-[0.28em] uppercase text-[#9aada8]">College project · 200-person services firm</p>
          <h1 className="serif text-5xl md:text-6xl leading-[1.05] mt-4">Performance management built for delivery work.</h1>
          <p className="mt-6 text-lg text-[#d8cfc0]">
            Goals, reviews, utilization, and feedback for Helix Consulting. Auth is Clerk, data lives in Supabase
            Postgres, mail goes through Resend, and the app is meant to ship on Vercel.
          </p>
          <Link href="/sign-in" className="inline-block mt-8 rounded-md bg-[#c24e1d] px-5 py-2.5 font-medium">
            Enter the workspace
          </Link>
        </section>
      </div>
    </main>
  );
}
