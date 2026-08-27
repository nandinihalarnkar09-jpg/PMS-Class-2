import { SignUp } from "@clerk/nextjs";
import { isClerkConfigured } from "@/lib/clerk-config";

export default function SignUpPage() {
  return (
    <main className="min-h-screen grid place-items-center p-8">
      <div className="w-full max-w-md">
        <h1 className="serif text-3xl mb-6 text-center">Create a Helix PMS account</h1>
        <p className="text-sm text-[#3d4f56] text-center mb-6">
          Use a seeded work email (for example employee@helix.consulting) so the directory role attaches automatically.
        </p>
        <div className="flex justify-center">
          {isClerkConfigured() ? (
            <SignUp />
          ) : (
            <p className="text-sm text-center text-[#3d4f56]">
              Add real Clerk keys from{" "}
              <a className="underline" href="https://dashboard.clerk.com" target="_blank" rel="noreferrer">
                dashboard.clerk.com
              </a>{" "}
              to <code className="text-xs">.env</code>, then restart the app.{" "}
              <a className="underline" href="/">
                Back to home
              </a>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
