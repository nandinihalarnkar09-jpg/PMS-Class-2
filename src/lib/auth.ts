import { notFound, redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "./db";
import {
  ROLES,
  type Role,
  canCalibrate,
  canSeePeopleDirectory,
  canSeeReports,
  canViewEmployee,
  canWriteManagerReview,
  normalizeRole,
  visibleEmployeeIds,
} from "./access";

export type SessionUser = {
  id: string;
  email: string;
  role: Role;
  employeeId: string | null;
  name: string;
};

const employeeInclude = {
  employee: {
    include: {
      department: true,
      manager: true,
      _count: { select: { reports: true } },
    },
  },
} as const;

export async function requireSession() {
  const { userId } = await auth();
  if (!userId) return null;

  const clerkUser = await currentUser();
  const email = (
    clerkUser?.primaryEmailAddress?.emailAddress ??
    clerkUser?.emailAddresses[0]?.emailAddress ??
    ""
  ).toLowerCase();
  if (!email) return null;

  let user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: employeeInclude,
  });

  if (!user) {
    const existing = await prisma.user.findUnique({
      where: { email },
      include: employeeInclude,
    });
    if (existing) {
      const role = normalizeRole(existing.role);
      user = await prisma.user.update({
        where: { id: existing.id },
        data: { clerkId: userId, role },
        include: employeeInclude,
      });
    } else {
      user = await prisma.user.create({
        data: { clerkId: userId, email, role: ROLES.employee },
        include: employeeInclude,
      });
    }
  }

  const role = normalizeRole(user.role);
  const name = user.employee
    ? `${user.employee.firstName} ${user.employee.lastName}`
    : clerkUser?.fullName ?? email;

  return {
    session: {
      id: user.id,
      email: user.email,
      role,
      employeeId: user.employee?.id ?? null,
      name,
    } satisfies SessionUser,
    user: { ...user, role },
    role,
  };
}

export type AccessContext = {
  role: Role;
  selfId: string;
  userId: string;
  name: string;
  visibleIds: string[];
  visible: Set<string>;
};

export async function requireAccess(): Promise<AccessContext> {
  const ctx = await requireSession();
  if (!ctx?.user.employee) redirect("/sign-in");
  const selfId = ctx.user.employee.id;
  const org = await prisma.employee.findMany({ select: { id: true, managerId: true } });
  const visibleIds = visibleEmployeeIds(ctx.role, selfId, org);
  return {
    role: ctx.role,
    selfId,
    userId: ctx.user.id,
    name: ctx.session.name,
    visibleIds,
    visible: new Set(visibleIds),
  };
}

export function assertCanViewEmployee(access: AccessContext, targetId: string) {
  if (!canViewEmployee(access.role, access.selfId, targetId, access.visible)) {
    notFound();
  }
}

export function assertCanWriteManagerReview(
  access: AccessContext,
  review: { employeeId: string; reviewerId: string | null },
) {
  if (!canWriteManagerReview(access.role, access.selfId, review, access.visible)) {
    notFound();
  }
}

export function assertHrAdmin(access: AccessContext) {
  if (!canCalibrate(access.role)) notFound();
}

export function assertCanSeeReports(access: AccessContext) {
  if (!canSeeReports(access.role)) notFound();
}

export function employeeScope(access: AccessContext): Prisma.EmployeeWhereInput {
  if (access.role === ROLES.hr_admin) return {};
  return { id: { in: access.visibleIds } };
}

export function reviewScope(access: AccessContext): Prisma.ReviewWhereInput {
  if (access.role === ROLES.hr_admin) return {};
  return { employeeId: { in: access.visibleIds } };
}

export function goalScope(access: AccessContext): Prisma.GoalWhereInput {
  if (access.role === ROLES.hr_admin) return {};
  return { employeeId: { in: access.visibleIds } };
}

export { canCalibrate, canSeePeopleDirectory, canSeeReports, ROLES, normalizeRole };
