export type ScoreFields = {
  selfScore: number | null;
  managerScore: number | null;
  finalScore: number | null;
  goal: { weight: number };
};

export function weightedScore(
  ratings: ScoreFields[],
  field: "selfScore" | "managerScore" | "finalScore",
) {
  let sum = 0;
  let weight = 0;
  for (const row of ratings) {
    const value = row[field];
    if (value == null) continue;
    sum += value * row.goal.weight;
    weight += row.goal.weight;
  }
  if (!weight) return null;
  return Number((sum / weight).toFixed(1));
}

export function displayOutcome(ratings: ScoreFields[], finalRating: number | null | undefined) {
  if (finalRating != null) return finalRating;
  return weightedScore(ratings, "finalScore") ?? weightedScore(ratings, "managerScore") ?? weightedScore(ratings, "selfScore");
}
