"use client";

import { useMemo, useState } from "react";
import { submitSelfAppraisal } from "./actions";

export const RATING_SCALE = [
  { value: 1, label: "1 — Unsatisfactory" },
  { value: 2, label: "2 — Developing" },
  { value: 3, label: "3 — Meets" },
  { value: 4, label: "4 — Exceeds" },
  { value: 5, label: "5 — Outstanding" },
] as const;

export type AppraisalGoal = {
  id: string;
  title: string;
  description: string | null;
  weightage: number;
  self_comment: string;
  self_rating: number | null;
};

const field = "mt-1 w-full rounded-md border border-[#d8cfc0] bg-white px-3 py-2 text-sm";

export function SelfAppraisalForm({ goals }: { goals: AppraisalGoal[] }) {
  const [comments, setComments] = useState(() =>
    Object.fromEntries(goals.map((goal) => [goal.id, goal.self_comment])),
  );
  const [ratings, setRatings] = useState(() =>
    Object.fromEntries(goals.map((goal) => [goal.id, goal.self_rating ? String(goal.self_rating) : ""])),
  );

  const ready = useMemo(
    () =>
      goals.length > 0 &&
      goals.every((goal) => {
        const comment = (comments[goal.id] ?? "").trim();
        const rating = Number(ratings[goal.id]);
        return comment.length > 0 && rating >= 1 && rating <= 5;
      }),
    [comments, goals, ratings],
  );

  return (
    <form action={submitSelfAppraisal} className="mt-8 space-y-4">
      {goals.map((goal) => (
        <fieldset key={goal.id} className="rounded-xl border border-[#d8cfc0] bg-white p-4">
          <legend className="font-medium text-[#162329]">{goal.title}</legend>
          <p className="text-sm text-[#3d4f56]">
            Weightage {goal.weightage}%
            {goal.description ? ` · ${goal.description}` : ""}
          </p>
          <label className="mt-4 block text-sm text-[#3d4f56]">
            Achievement comment
            <textarea
              className={`${field} min-h-24`}
              name={`comment_${goal.id}`}
              required
              value={comments[goal.id] ?? ""}
              onChange={(event) => setComments((prev) => ({ ...prev, [goal.id]: event.target.value }))}
            />
          </label>
          <label className="mt-3 block text-sm text-[#3d4f56]">
            Self-rating (1–5)
            <select
              className={field}
              name={`rating_${goal.id}`}
              required
              value={ratings[goal.id] ?? ""}
              onChange={(event) => setRatings((prev) => ({ ...prev, [goal.id]: event.target.value }))}
            >
              <option value="">Select a rating</option>
              {RATING_SCALE.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </fieldset>
      ))}
      <button
        type="submit"
        disabled={!ready}
        className="rounded-md bg-[#1f6f64] px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        Submit Self-Appraisal
      </button>
    </form>
  );
}
