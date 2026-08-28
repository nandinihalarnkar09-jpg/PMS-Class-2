const outline =
  "inline-flex items-center rounded-md border border-[#d8cfc0] bg-white px-4 py-2 text-sm";
const solid = "inline-flex items-center rounded-md bg-[#162329] px-4 py-2 text-sm text-[#f4efe6]";

const localApp = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export function HeaderAuth() {
  return (
    <div className="flex items-center gap-2">
      <a href={`${localApp}/sign-in`} className={outline}>
        Sign in
      </a>
      <a href={`${localApp}/sign-up`} className={solid}>
        Sign up
      </a>
    </div>
  );
}
