import { SignIn } from "@clerk/nextjs";
import { isClerkConfigured } from "@/lib/clerk-config";

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
            Clerk handles identity. Your Helix role is applied from the people directory after the first login with a
            seeded work email.
          </p>
        </div>
        <p className="relative text-sm text-[#9aada8]">Demo emails: employee / manager / hr / admin @helix.consulting</p>
      </section>
      <section className="flex items-center justify-center p-8">
        {isClerkConfigured() ? (
          <SignIn />
        ) : (
          <div className="max-w-md space-y-4 text-[#162329]">
            <h2 className="serif text-2xl">Clerk keys are not set yet</h2>
            <p className="text-sm leading-6 text-[#3d4f56]">
              This project is linked to Clerk app <code className="text-xs">app_3IWJOUtTlOTuy1xfMODe1McNKQe</code>.
              Sign-in widgets load after Clerk keys are available in the environment.
            </p>
            <a href="/" className="inline-block text-sm underline">
              Back to home
            </a>
          </div>
        )}
      </section>
    </main>
  );
}
