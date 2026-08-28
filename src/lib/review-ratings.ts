import { prisma } from "./db";

export async function ensureGoalRatings(reviewId: string) {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: { goalRatings: true },
  });
  if (!review) return;
  const goals = await prisma.goal.findMany({
    where: { employeeId: review.employeeId, cycleId: review.cycleId },
  });
  const have = new Set(review.goalRatings.map((r) => r.goalId));
  const missing = goals.filter((g) => !have.has(g.id));
  if (missing.length === 0) return;
  await prisma.goalRating.createMany({
    data: missing.map((g) => ({ reviewId, goalId: g.id })),
  });
}
