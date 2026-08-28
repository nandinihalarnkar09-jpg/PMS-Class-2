import { HelixClerkProvider } from "@/components/helix-clerk-provider";

export default function ClerkPagesLayout({ children }: { children: React.ReactNode }) {
  return <HelixClerkProvider>{children}</HelixClerkProvider>;
}
