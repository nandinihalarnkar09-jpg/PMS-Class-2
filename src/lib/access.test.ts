import assert from "node:assert/strict";
import test from "node:test";
import {
  ROLES,
  canCalibrate,
  canViewEmployee,
  canWriteManagerReview,
  descendantIds,
  normalizeRole,
  visibleEmployeeIds,
} from "./access";

const org = [
  { id: "ceo", managerId: null },
  { id: "mgr", managerId: "ceo" },
  { id: "emp", managerId: "mgr" },
  { id: "peer", managerId: "ceo" },
];

test("normalizeRole maps legacy and current names", () => {
  assert.equal(normalizeRole("HR"), ROLES.hr_admin);
  assert.equal(normalizeRole("ADMIN"), ROLES.hr_admin);
  assert.equal(normalizeRole("hr_admin"), ROLES.hr_admin);
  assert.equal(normalizeRole("MANAGER"), ROLES.manager);
  assert.equal(normalizeRole("EMPLOYEE"), ROLES.employee);
  assert.equal(normalizeRole("employee"), ROLES.employee);
});

test("descendantIds walks manager_id, not siblings", () => {
  const underMgr = descendantIds("mgr", org);
  assert.equal(underMgr.has("emp"), true);
  assert.equal(underMgr.has("peer"), false);
  assert.equal(underMgr.has("ceo"), false);
});

test("employee cannot view another person by id", () => {
  const visible = new Set(visibleEmployeeIds(ROLES.employee, "emp", org));
  assert.equal(canViewEmployee(ROLES.employee, "emp", "emp", visible), true);
  assert.equal(canViewEmployee(ROLES.employee, "emp", "peer", visible), false);
  assert.equal(canViewEmployee(ROLES.employee, "emp", "mgr", visible), false);
});

test("manager can view reports, not a sibling branch", () => {
  const visible = new Set(visibleEmployeeIds(ROLES.manager, "mgr", org));
  assert.equal(canViewEmployee(ROLES.manager, "mgr", "emp", visible), true);
  assert.equal(canViewEmployee(ROLES.manager, "mgr", "peer", visible), false);
  assert.equal(canViewEmployee(ROLES.manager, "mgr", "mgr", visible), true);
});

test("hr_admin can view anyone", () => {
  const visible = new Set(visibleEmployeeIds(ROLES.hr_admin, "ceo", org));
  assert.equal(canViewEmployee(ROLES.hr_admin, "ceo", "peer", visible), true);
  assert.equal(canCalibrate(ROLES.hr_admin), true);
  assert.equal(canCalibrate(ROLES.manager), false);
  assert.equal(canCalibrate(ROLES.employee), false);
});

test("employee cannot submit a manager review even if they know the id", () => {
  const visible = new Set(visibleEmployeeIds(ROLES.employee, "emp", org));
  const review = { employeeId: "peer", reviewerId: "mgr" };
  assert.equal(canWriteManagerReview(ROLES.employee, "emp", review, visible), false);
  assert.equal(canWriteManagerReview(ROLES.manager, "mgr", { employeeId: "emp", reviewerId: "mgr" }, new Set(visibleEmployeeIds(ROLES.manager, "mgr", org))), true);
  assert.equal(canWriteManagerReview(ROLES.manager, "mgr", { employeeId: "peer", reviewerId: "ceo" }, new Set(visibleEmployeeIds(ROLES.manager, "mgr", org))), false);
});
