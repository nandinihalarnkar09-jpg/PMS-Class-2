import { UserButton } from "@clerk/nextjs";

export default function AccountNotSetupPage() {
  return (
    <main className="min-h-screen bg-[#f4efe6] px-6 py-16">
      <div className="mx-auto max-w-lg rounded-xl border border-[#d8cfc0] bg-white p-8">
        <h1 className="serif text-3xl text-[#162329]">Your account is not yet set up. Please contact HR.</h1>
        <p className="mt-4 text-sm leading-6 text-[#3d4f56]">
          You signed in, but there is no employee row with this email. HR needs to add you to the directory before you
          can use Helix PMS.
        </p>
        <div className="mt-6">
          <UserButton />
        </div>
      </div>
    </main>
  );
}
