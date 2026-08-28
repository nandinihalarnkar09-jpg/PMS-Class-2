import { StaffShell } from "@/components/staff-shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <StaffShell>{children}</StaffShell>;
}
