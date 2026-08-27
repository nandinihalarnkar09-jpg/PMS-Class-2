/**
 * Clerk's documented Next.js setup always mounts ClerkProvider + clerkMiddleware.
 * We only skip that when keys are missing or are known placeholders, so the browser
 * does not call a non-existent *.accounts.dev host (ERR_SSL_VERSION_OR_CIPHER_MISMATCH).
 */
export function isClerkConfigured() {
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  const sk = process.env.CLERK_SECRET_KEY ?? "";
  const pkOk = pk.startsWith("pk_test_") || pk.startsWith("pk_live_");
  const skOk = sk.startsWith("sk_test_") || sk.startsWith("sk_live_");
  if (!pkOk || !skOk) return false;
  if (sk.includes("placeholder")) return false;
  try {
    const decoded = Buffer.from(pk.replace(/^pk_(test|live)_/, ""), "base64").toString("utf8");
    if (decoded.includes("helix-pms.accounts.dev")) return false;
  } catch {
    return false;
  }
  return true;
}
