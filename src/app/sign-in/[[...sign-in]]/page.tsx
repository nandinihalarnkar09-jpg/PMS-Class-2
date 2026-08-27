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
              The previous publishable key pointed at clerk.helix-pms.accounts.dev, which is not a real Clerk app, so
              the browser showed ERR_SSL_VERSION_OR_CIPHER_MISMATCH.
            </p>
            <ol className="list-decimal pl-5 text-sm leading-6 text-[#3d4f56] space-y-2">
              <li>
                Create an application at{" "}
                <a className="underline" href="https://dashboard.clerk.com" target="_blank" rel="noreferrer">
                  dashboard.clerk.com
                </a>
              </li>
              <li>
                Copy <code className="text-xs">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> and{" "}
                <code className="text-xs">CLERK_SECRET_KEY</code> into <code className="text-xs">.env</code>
              </li>
              <li>
                Restart <code className="text-xs">npm run dev</code>
              </li>
            </ol>
            <a href="/" className="inline-block text-sm underline">
              Back to home
            </a>
          </div>
        )}
      </section>
    </main>
  );
}
