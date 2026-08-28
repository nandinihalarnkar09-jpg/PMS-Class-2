import { HelixClerkProvider } from "@/components/helix-clerk-provider";

export default function AccountNotSetupLayout({ children }: { children: React.ReactNode }) {
  return <HelixClerkProvider>{children}</HelixClerkProvider>;
}
