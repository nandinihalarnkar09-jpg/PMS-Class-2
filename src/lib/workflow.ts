export const GOAL_STATES = {
  draft: "draft",
  submitted: "submitted",
  approved: "approved",
  sent_back: "sent_back",
} as const;

export type GoalState = (typeof GOAL_STATES)[keyof typeof GOAL_STATES];

export const REVIEW_STATES = {
  not_started: "not_started",
  self_appraisal_submitted: "self_appraisal_submitted",
  manager_reviewed: "manager_reviewed",
  completed: "completed",
} as const;

export type ReviewState = (typeof REVIEW_STATES)[keyof typeof REVIEW_STATES];

const GOAL_TRANSITIONS: Record<GoalState, GoalState[]> = {
  draft: ["submitted"],
  submitted: ["approved", "sent_back"],
  sent_back: ["submitted"],
  approved: [],
};

const REVIEW_TRANSITIONS: Record<ReviewState, ReviewState[]> = {
  not_started: ["self_appraisal_submitted"],
  self_appraisal_submitted: ["manager_reviewed"],
  manager_reviewed: ["completed"],
  completed: [],
};

export function isGoalState(value: string): value is GoalState {
  return value in GOAL_TRANSITIONS;
}

export function isReviewState(value: string): value is ReviewState {
  return value in REVIEW_TRANSITIONS;
}

export function canTransitionGoal(from: string, to: string) {
  if (!isGoalState(from) || !isGoalState(to)) return false;
  return GOAL_TRANSITIONS[from].includes(to);
}

export function canTransitionReview(from: string, to: string) {
  if (!isReviewState(from) || !isReviewState(to)) return false;
  return REVIEW_TRANSITIONS[from].includes(to);
}

export function goalPlanEditable(status: string) {
  return status === GOAL_STATES.draft || status === GOAL_STATES.sent_back;
}

export function reviewSelfOpen(status: string) {
  return status === REVIEW_STATES.not_started;
}

export function reviewManagerOpen(status: string) {
  return status === REVIEW_STATES.self_appraisal_submitted;
}

export function reviewCompleteOpen(status: string) {
  return status === REVIEW_STATES.manager_reviewed;
}

export function reviewManagerVisible(status: string) {
  return status === REVIEW_STATES.manager_reviewed || status === REVIEW_STATES.completed;
}
