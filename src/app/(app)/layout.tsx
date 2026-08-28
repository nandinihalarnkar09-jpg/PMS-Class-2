import { HelixClerkProvider } from "@/components/helix-clerk-provider";
import { StaffShell } from "@/components/staff-shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <HelixClerkProvider>
      <StaffShell>{children}</StaffShell>
    </HelixClerkProvider>
  );
}
