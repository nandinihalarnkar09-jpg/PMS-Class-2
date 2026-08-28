import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Fraunces, Outfit } from "next/font/google";
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
  return (
    <html lang="en">
      <body className={`${sans.variable} ${serif.variable} antialiased`}>
        <ClerkProvider
          afterSignOutUrl="/"
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
      </body>
    </html>
  );
}
