import Link from "next/link";

const features = [
  {
    title: "Goals and cycles",
    description:
      "Set team and individual goals, then run a shared review cycle so everyone knows what is expected.",
  },
  {
    title: "Reviews and feedback",
    description:
      "Collect manager, self, and peer input in one place. Keep ratings and comments consistent across the company.",
  },
  {
    title: "Growth conversations",
    description:
      "Support 1:1s and development plans so performance discussions continue between formal reviews.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-full flex-col bg-neutral-50 text-neutral-900">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <p className="text-sm font-semibold tracking-tight">Performance</p>
          <Link
            href="/sign-in"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Sign In
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-16 sm:py-24">
        <section className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Performance
          </h1>
          <p className="mt-3 text-lg leading-7 text-neutral-600">
            A simple performance management system for a 200-person services
            company.
          </p>
        </section>

        <section className="mt-14 grid gap-4 sm:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-lg border border-neutral-200 bg-white p-5"
            >
              <h2 className="text-base font-semibold tracking-tight">
                {feature.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                {feature.description}
              </p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
