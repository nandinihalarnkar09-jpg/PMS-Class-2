const outline =
  "inline-flex items-center rounded-md border border-[#d8cfc0] bg-white px-4 py-2 text-sm";
const solid = "inline-flex items-center rounded-md bg-[#162329] px-4 py-2 text-sm text-[#f4efe6]";

export function HeaderAuth() {
  return (
    <div className="flex items-center gap-2">
      <a href="/sign-in" className={outline}>
        Sign in
      </a>
      <a href="/sign-up" className={solid}>
        Sign up
      </a>
    </div>
  );
}
