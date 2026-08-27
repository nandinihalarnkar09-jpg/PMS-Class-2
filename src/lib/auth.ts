import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "./db";

export type SessionUser = {
  id: string;
  email: string;
  role: string;
  employeeId: string | null;
  name: string;
};

const employeeInclude = {
  employee: { include: { department: true, manager: true } },
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
      user = await prisma.user.update({
        where: { id: existing.id },
        data: { clerkId: userId },
        include: employeeInclude,
      });
    } else {
      user = await prisma.user.create({
        data: { clerkId: userId, email, role: "EMPLOYEE" },
        include: employeeInclude,
      });
    }
  }

  const name = user.employee
    ? `${user.employee.firstName} ${user.employee.lastName}`
    : clerkUser?.fullName ?? email;

  return {
    session: {
      id: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employee?.id ?? null,
      name,
    } satisfies SessionUser,
    user,
  };
}

export function canManagePeople(role: string) {
  return role === "ADMIN" || role === "HR";
}

export function isLeader(role: string) {
  return role === "ADMIN" || role === "HR" || role === "MANAGER";
}
