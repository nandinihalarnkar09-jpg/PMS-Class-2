export function fullName(emp: { firstName: string; lastName: string } | null | undefined) {
  if (!emp) return "—";
  return `${emp.firstName} ${emp.lastName}`;
}

export function initials(emp: { firstName: string; lastName: string } | null | undefined) {
  if (!emp) return "?";
  return `${emp.firstName[0] ?? ""}${emp.lastName[0] ?? ""}`.toUpperCase();
}

export function formatDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function pct(n: number) {
  return `${Math.round(n)}%`;
}
