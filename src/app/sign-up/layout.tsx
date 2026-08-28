import { HelixClerkProvider } from "@/components/helix-clerk-provider";

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return <HelixClerkProvider>{children}</HelixClerkProvider>;
}
