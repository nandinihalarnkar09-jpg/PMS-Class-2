import { SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";

const outline =
  "inline-flex items-center rounded-md border border-[#d8cfc0] bg-white px-4 py-2 text-sm";
const solid = "inline-flex items-center rounded-md bg-[#162329] px-4 py-2 text-sm text-[#f4efe6]";

export function HeaderAuth() {
  return (
    <div className="flex items-center gap-2">
      <Show when="signed-out">
        <SignInButton>
          <button type="button" className={outline}>
            Sign in
          </button>
        </SignInButton>
        <SignUpButton>
          <button type="button" className={solid}>
            Sign up
          </button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </div>
  );
}
