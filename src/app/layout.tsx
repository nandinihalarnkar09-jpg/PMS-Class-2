import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Fraunces, Outfit } from "next/font/google";
import { isClerkConfigured } from "@/lib/clerk-config";
import "./globals.css";

const sans = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
});

const serif = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "Helix PMS",
  description: "Performance management for Helix Consulting",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const html = (
    <html lang="en">
      <body className={`${sans.variable} ${serif.variable} antialiased`}>{children}</body>
    </html>
  );

  if (!isClerkConfigured()) {
    return html;
  }

  return (
    <ClerkProvider
      afterSignOutUrl="/"
      appearance={{
        variables: {
          colorPrimary: "#c24e1d",
          colorBackground: "#f4efe6",
          colorText: "#162329",
          borderRadius: "0.5rem",
          fontFamily: "var(--font-sans)",
        },
      }}
    >
      {html}
    </ClerkProvider>
  );
}
