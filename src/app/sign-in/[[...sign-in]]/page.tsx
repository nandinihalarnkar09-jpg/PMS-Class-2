import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="min-h-screen grid lg:grid-cols-[1.1fr_0.9fr]">
      <section className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden bg-[#162329] text-[#f4efe6]">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(circle at 20% 20%, #1f6f64 0%, transparent 42%), radial-gradient(circle at 80% 80%, #c24e1d 0%, transparent 36%)",
          }}
        />
        <p className="relative text-sm tracking-[0.28em] uppercase text-[#d8cfc0]">Helix Consulting</p>
        <div className="relative max-w-lg">
          <h1 className="serif text-5xl leading-[1.1] font-medium">Sign in to the appraisal workspace.</h1>
          <p className="mt-6 text-[#d8cfc0] text-lg">
            Use your work email. Helix matches that email to your employee row and applies your role.
          </p>
        </div>
      </section>
      <section className="flex items-center justify-center p-8">
        <SignIn />
      </section>
    </main>
  );
}
