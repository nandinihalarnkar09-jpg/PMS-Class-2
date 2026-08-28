"use client";

import { ClerkProvider } from "@clerk/nextjs";

export function HelixClerkProvider({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      afterSignOutUrl="/"
      allowedRedirectOrigins={[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://*.cursorvm.com",
        "https://*.agent.cvm.dev",
      ]}
      appearance={{
        variables: {
          colorPrimary: "#c24e1d",
          colorBackground: "#f4efe6",
          borderRadius: "0.5rem",
          fontFamily: "var(--font-sans)",
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
