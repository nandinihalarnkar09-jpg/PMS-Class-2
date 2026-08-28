import assert from "node:assert/strict";
import test from "node:test";
import {
  GOAL_STATES,
  REVIEW_STATES,
  canTransitionGoal,
  canTransitionReview,
  goalPlanEditable,
} from "./workflow";

test("goals move draft → submitted → approved or sent_back", () => {
  assert.equal(canTransitionGoal(GOAL_STATES.draft, GOAL_STATES.submitted), true);
  assert.equal(canTransitionGoal(GOAL_STATES.submitted, GOAL_STATES.approved), true);
  assert.equal(canTransitionGoal(GOAL_STATES.submitted, GOAL_STATES.sent_back), true);
  assert.equal(canTransitionGoal(GOAL_STATES.sent_back, GOAL_STATES.submitted), true);
  assert.equal(canTransitionGoal(GOAL_STATES.draft, GOAL_STATES.approved), false);
  assert.equal(canTransitionGoal(GOAL_STATES.approved, GOAL_STATES.sent_back), false);
  assert.equal(canTransitionGoal(GOAL_STATES.approved, GOAL_STATES.draft), false);
});

test("reviews move not_started → self_appraisal_submitted → manager_reviewed → completed", () => {
  assert.equal(canTransitionReview(REVIEW_STATES.not_started, REVIEW_STATES.self_appraisal_submitted), true);
  assert.equal(canTransitionReview(REVIEW_STATES.self_appraisal_submitted, REVIEW_STATES.manager_reviewed), true);
  assert.equal(canTransitionReview(REVIEW_STATES.manager_reviewed, REVIEW_STATES.completed), true);
  assert.equal(canTransitionReview(REVIEW_STATES.not_started, REVIEW_STATES.completed), false);
  assert.equal(canTransitionReview(REVIEW_STATES.self_appraisal_submitted, REVIEW_STATES.completed), false);
  assert.equal(canTransitionReview(REVIEW_STATES.completed, REVIEW_STATES.not_started), false);
});

test("plan is editable only in draft or sent_back", () => {
  assert.equal(goalPlanEditable(GOAL_STATES.draft), true);
  assert.equal(goalPlanEditable(GOAL_STATES.sent_back), true);
  assert.equal(goalPlanEditable(GOAL_STATES.submitted), false);
  assert.equal(goalPlanEditable(GOAL_STATES.approved), false);
});
