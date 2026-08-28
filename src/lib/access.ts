export const ROLES = {
  employee: "employee",
  manager: "manager",
  hr_admin: "hr_admin",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export type OrgRow = { id: string; managerId: string | null };

export function normalizeRole(role: string | null | undefined): Role {
  const value = (role ?? "").toLowerCase().replace(/-/g, "_");
  if (value === "hr_admin" || value === "hr" || value === "admin") return ROLES.hr_admin;
  if (value === "manager") return ROLES.manager;
  return ROLES.employee;
}

export function descendantIds(rootId: string, people: OrgRow[]): Set<string> {
  const children = new Map<string, string[]>();
  for (const person of people) {
    if (!person.managerId) continue;
    const list = children.get(person.managerId) ?? [];
    list.push(person.id);
    children.set(person.managerId, list);
  }
  const out = new Set<string>();
  const stack = [...(children.get(rootId) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    if (out.has(id)) continue;
    out.add(id);
    stack.push(...(children.get(id) ?? []));
  }
  return out;
}

export function visibleEmployeeIds(role: Role, selfId: string, people: OrgRow[]): string[] {
  if (role === ROLES.hr_admin) return people.map((p) => p.id);
  if (role === ROLES.manager) return [selfId, ...descendantIds(selfId, people)];
  return [selfId];
}

export function canViewEmployee(role: Role, selfId: string, targetId: string, visible: Set<string>) {
  if (role === ROLES.hr_admin) return true;
  if (selfId === targetId) return true;
  if (role === ROLES.manager && visible.has(targetId)) return true;
  return false;
}

export function canWriteManagerReview(role: Role, selfId: string, review: { employeeId: string; reviewerId: string | null }, visible: Set<string>) {
  if (role === ROLES.employee) return false;
  if (role === ROLES.hr_admin) return true;
  if (review.reviewerId === selfId) return true;
  return visible.has(review.employeeId) && review.employeeId !== selfId;
}

export function canCalibrate(role: Role) {
  return role === ROLES.hr_admin;
}

export function canSeeReports(role: Role) {
  return role === ROLES.manager || role === ROLES.hr_admin;
}

export function canSeePeopleDirectory(role: Role) {
  return role === ROLES.manager || role === ROLES.hr_admin;
}
