import { HeaderAuth } from "@/components/header-auth";

export default function Home() {
  return (
    <main className="min-h-screen">
      <header className="flex items-center justify-between px-6 py-5 max-w-5xl mx-auto">
        <p className="text-lg font-medium tracking-tight">Helix PMS</p>
        <HeaderAuth />
      </header>

      <section className="max-w-5xl mx-auto px-6 pt-16 pb-10">
        <h1 className="serif text-4xl md:text-5xl">Helix PMS</h1>
        <p className="mt-4 text-lg text-[#3d4f56] max-w-xl">
          Performance reviews and goals for a 200-person services company.
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-20 grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border border-[#d8cfc0] bg-white p-5">
          <h2 className="font-medium">Goals</h2>
          <p className="mt-2 text-sm text-[#3d4f56]">
            Staff set a plan, submit it, and a manager approves it or sends it back.
          </p>
        </article>
        <article className="rounded-xl border border-[#d8cfc0] bg-white p-5">
          <h2 className="font-medium">Reviews</h2>
          <p className="mt-2 text-sm text-[#3d4f56]">
            Self-appraisal, then manager review, then a completed packet for the cycle.
          </p>
        </article>
        <article className="rounded-xl border border-[#d8cfc0] bg-white p-5">
          <h2 className="font-medium">Roles</h2>
          <p className="mt-2 text-sm text-[#3d4f56]">
            Employee, manager, and HR admin see the same screens with different access.
          </p>
        </article>
      </section>
    </main>
  );
}
