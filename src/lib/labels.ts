export const ROLE_LABEL: Record<string, string> = {
  employee: "Employee",
  manager: "Manager",
  hr_admin: "HR admin",
};

export const GOAL_STATUS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  approved: "Approved",
  sent_back: "Sent back",
};

export const REVIEW_STATUS: Record<string, string> = {
  not_started: "Not started",
  self_appraisal_submitted: "Self-appraisal submitted",
  manager_reviewed: "Manager reviewed",
  completed: "Completed",
};

export const GOAL_CATEGORY: Record<string, string> = {
  BUSINESS: "Business",
  CLIENT: "Client",
  PEOPLE: "People",
  SELF: "Self",
};

export const FEEDBACK_TYPE: Record<string, string> = {
  PRAISE: "Praise",
  COACHING: "Coaching",
  PEER: "Peer note",
};

export const RATING_BANDS = [
  { min: 4.5, label: "Outstanding", hint: "Consistently beyond role" },
  { min: 3.6, label: "Exceeds", hint: "Above expected outcomes" },
  { min: 2.6, label: "Meets", hint: "Solid, reliable delivery" },
  { min: 1.6, label: "Developing", hint: "Gaps to close this cycle" },
  { min: 0, label: "Unsatisfactory", hint: "Performance plan needed" },
];

export function ratingBand(value: number | null | undefined) {
  if (value == null) return null;
  return RATING_BANDS.find((b) => value >= b.min) ?? RATING_BANDS[RATING_BANDS.length - 1];
}

export const DEMO_ACCOUNTS = [
  { email: "hr@helix.consulting", role: "hr_admin", name: "Ananya Iyer" },
  { email: "manager@helix.consulting", role: "manager", name: "Rohan Desai" },
  { email: "employee@helix.consulting", role: "employee", name: "Diya Patel" },
];
