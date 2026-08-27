import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();

const FIRST = [
  "Aarav", "Aditi", "Ananya", "Arjun", "Diya", "Ishaan", "Kavya", "Rohan", "Sneha", "Vihaan",
  "Meera", "Kabir", "Nisha", "Rahul", "Priya", "Dev", "Isha", "Nikhil", "Pooja", "Siddharth",
  "Anika", "Harsh", "Tanvi", "Varun", "Riya", "Ayaan", "Sana", "Kunal", "Neha", "Yash",
  "Sara", "Manav", "Ira", "Aryan", "Myra", "Reyansh", "Zara", "Vivaan", "Kiara", "Advait",
];
const LAST = [
  "Sharma", "Patel", "Reddy", "Iyer", "Nair", "Khan", "Mehta", "Gupta", "Joshi", "Desai",
  "Kulkarni", "Banerjee", "Chopra", "Malhotra", "Singh", "Pillai", "Rao", "Kapoor", "Das", "Menon",
];
const LOCATIONS = ["Bengaluru", "Pune", "Hyderabad", "Mumbai", "Chennai", "Gurugram"];
const BANDS = ["A1", "A2", "B1", "B2", "C1", "C2", "D1"];
const COMPETENCIES = [
  "Client stewardship",
  "Delivery excellence",
  "Problem solving",
  "Collaboration",
  "Ownership",
];

const DEPARTMENTS: { name: string; code: string; titles: string[]; size: number; util: number }[] = [
  { name: "Leadership", code: "LDR", titles: ["Chief Executive Officer", "Chief Operating Officer", "Chief People Officer"], size: 3, util: 40 },
  { name: "Delivery Management", code: "DM", titles: ["Delivery Manager", "Engagement Manager", "Project Manager", "Scrum Master"], size: 28, util: 75 },
  { name: "Digital Consulting", code: "DC", titles: ["Principal Consultant", "Senior Consultant", "Consultant", "Associate Consultant"], size: 62, util: 85 },
  { name: "Technology Engineering", code: "TE", titles: ["Engineering Manager", "Tech Lead", "Senior Engineer", "Software Engineer"], size: 48, util: 82 },
  { name: "Sales & Alliances", code: "SA", titles: ["Sales Director", "Account Executive", "Pre-Sales Consultant", "Partner Manager"], size: 16, util: 55 },
  { name: "Human Resources", code: "HR", titles: ["HR Business Partner", "Talent Partner", "People Operations Specialist"], size: 10, util: 70 },
  { name: "Finance & Legal", code: "FL", titles: ["Finance Controller", "Analyst", "Commercial Manager"], size: 12, util: 72 },
  { name: "Operations", code: "OPS", titles: ["Facilities Lead", "Admin Executive", "IT Support Specialist"], size: 21, util: 78 },
];

const GOAL_BANK = [
  { title: "Improve billed utilization", category: "BUSINESS", description: "Hold a sustainable utilization band while protecting quality of delivery." },
  { title: "On-time milestone delivery", category: "CLIENT", description: "Deliver committed sprint/milestone dates with fewer than two severity-1 slips." },
  { title: "Client CSAT of 4.5+", category: "CLIENT", description: "Close the cycle with average CSAT at or above 4.5 from named accounts." },
  { title: "Grow a junior teammate", category: "PEOPLE", description: "Mentor one associate through a documented skill plan and two shadow opportunities." },
  { title: "Earn a new credential", category: "SELF", description: "Complete one role-relevant certification or internal academy track." },
  { title: "Reduce rework on deliverables", category: "BUSINESS", description: "Cut review-loop rework hours by 20% versus last cycle." },
  { title: "Expand account footprint", category: "CLIENT", description: "Identify and staff one adjacent workstream with an existing client." },
  { title: "Knowledge contribution", category: "PEOPLE", description: "Publish two reusable assets (playbook, estimator, or demo) used by another squad." },
];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function ratingLabel(n: number) {
  if (n >= 4.5) return 5;
  if (n >= 3.6) return 4;
  if (n >= 2.6) return 3;
  if (n >= 1.6) return 2;
  return 1;
}

type Planned = {
  userId: string;
  empId: string;
  email: string;
  role: string;
  first: string;
  last: string;
  title: string;
  deptIndex: number;
  band: string;
  util: number;
  managerKey?: string;
  key: string;
};

async function main() {
  await prisma.feedback.deleteMany();
  await prisma.competencyScore.deleteMany();
  await prisma.review.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.reviewCycle.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.department.deleteMany();
  await prisma.user.deleteMany();

  const depts = await Promise.all(
    DEPARTMENTS.map((d) => prisma.department.create({ data: { name: d.name, code: d.code } })),
  );

  const cycle = await prisma.reviewCycle.create({
    data: {
      name: "Annual Appraisal",
      period: "FY 2025–26",
      startDate: new Date("2025-04-01"),
      endDate: new Date("2026-03-31"),
      status: "ACTIVE",
    },
  });

  const planned: Planned[] = [];
  const named: Planned[] = [
    { key: "ceo", userId: randomUUID(), empId: randomUUID(), email: "ceo@helix.consulting", first: "Leela", last: "Menon", title: "Chief Executive Officer", role: "ADMIN", deptIndex: 0, band: "D1", util: 38 },
    { key: "admin", userId: randomUUID(), empId: randomUUID(), email: "admin@helix.consulting", first: "Kabir", last: "Shah", title: "People Systems Admin", role: "ADMIN", deptIndex: 5, band: "C1", util: 65, managerKey: "ceo" },
    { key: "hr", userId: randomUUID(), empId: randomUUID(), email: "hr@helix.consulting", first: "Ananya", last: "Iyer", title: "HR Business Partner", role: "HR", deptIndex: 5, band: "C1", util: 72, managerKey: "ceo" },
    { key: "manager", userId: randomUUID(), empId: randomUUID(), email: "manager@helix.consulting", first: "Rohan", last: "Desai", title: "Delivery Manager", role: "MANAGER", deptIndex: 1, band: "C2", util: 78, managerKey: "ceo" },
    { key: "employee", userId: randomUUID(), empId: randomUUID(), email: "employee@helix.consulting", first: "Diya", last: "Patel", title: "Consultant", role: "EMPLOYEE", deptIndex: 2, band: "B1", util: 86, managerKey: "manager" },
  ];
  planned.push(...named);

  const heads: Record<number, string> = { 0: "ceo", 1: "manager", 5: "hr" };
  const headTitles: Record<number, string> = {
    2: "Practice Director, Digital",
    3: "Head of Engineering",
    4: "Sales Director",
    6: "Finance Controller",
    7: "Head of Operations",
  };
  for (const deptIndex of [2, 3, 4, 6, 7]) {
    const key = `head-${deptIndex}`;
    planned.push({
      key,
      userId: randomUUID(),
      empId: randomUUID(),
      email: `head.${DEPARTMENTS[deptIndex].code.toLowerCase()}@helix.consulting`,
      first: pick(FIRST, deptIndex + 4),
      last: pick(LAST, deptIndex + 9),
      title: headTitles[deptIndex],
      role: "MANAGER",
      deptIndex,
      band: "D1",
      util: DEPARTMENTS[deptIndex].util - 10,
      managerKey: "ceo",
    });
    heads[deptIndex] = key;
  }

  let seq = planned.length;
  while (planned.length < 200) {
    const counts = DEPARTMENTS.map((d, idx) => ({
      idx,
      left: d.size - planned.filter((p) => p.deptIndex === idx).length,
    })).filter((x) => x.left > 0);
    if (counts.length === 0) break;
    const slot = counts[seq % counts.length];
    const d = DEPARTMENTS[slot.idx];
    seq += 1;
    const first = pick(FIRST, seq * 3);
    const last = pick(LAST, seq * 5 + 2);
    const isMgr = planned.filter((p) => p.deptIndex === slot.idx).length % 8 === 0;
    planned.push({
      key: `e${seq}`,
      userId: randomUUID(),
      empId: randomUUID(),
      email: `${first.toLowerCase()}.${last.toLowerCase()}${seq}@helix.consulting`,
      first,
      last,
      title: pick(d.titles, seq),
      role: isMgr ? "MANAGER" : "EMPLOYEE",
      deptIndex: slot.idx,
      band: pick(BANDS, seq),
      util: clamp(d.util + ((seq * 7) % 21) - 10, 30, 110),
      managerKey: isMgr ? heads[slot.idx] : slot.idx === 2 ? "manager" : heads[slot.idx],
    });
  }

  const byKey = new Map(planned.map((p) => [p.key, p]));

  await prisma.user.createMany({
    data: planned.map((p) => ({
      id: p.userId,
      email: p.email,
      role: p.role,
    })),
  });

  await prisma.employee.createMany({
    data: planned.map((p, i) => ({
      id: p.empId,
      employeeCode: `HX${String(i + 1).padStart(4, "0")}`,
      userId: p.userId,
      firstName: p.first,
      lastName: p.last,
      title: p.title,
      location: pick(LOCATIONS, i),
      joinDate: new Date(2016 + (i % 9), i % 12, 1 + (i % 27)),
      band: p.band,
      utilizationTarget: DEPARTMENTS[p.deptIndex].util,
      utilizationActual: p.util,
      departmentId: depts[p.deptIndex].id,
    })),
  });

  const managerUpdates = planned.filter((p) => p.managerKey && byKey.get(p.managerKey));
  for (let i = 0; i < managerUpdates.length; i += 40) {
    const chunk = managerUpdates.slice(i, i + 40);
    await prisma.$transaction(
      chunk.map((p) =>
        prisma.employee.update({
          where: { id: p.empId },
          data: { managerId: byKey.get(p.managerKey!)!.empId },
        }),
      ),
    );
  }

  const goals = [];
  const reviews = [];
  const scores = [];
  const statuses = ["SELF_IN_PROGRESS", "SELF_SUBMITTED", "MANAGER_IN_PROGRESS", "MANAGER_SUBMITTED", "CALIBRATED"];

  for (let i = 0; i < planned.length; i++) {
    const p = planned[i];
    const gCount = 3 + (p.first.length % 2);
    for (let g = 0; g < gCount; g++) {
      const proto = pick(GOAL_BANK, i + g);
      const progress = (p.util + g * 17) % 101;
      const status =
        progress >= 100 ? "COMPLETED" : progress >= 70 ? "ON_TRACK" : progress >= 40 ? "AT_RISK" : "NOT_STARTED";
      goals.push({
        id: randomUUID(),
        employeeId: p.empId,
        cycleId: cycle.id,
        title: proto.title,
        description: proto.description,
        category: proto.category,
        weight: g === gCount - 1 ? 100 - 25 * (gCount - 1) : 25,
        progress,
        status,
      });
    }

    const selfRating = clamp(2.4 + p.util / 40 + (p.first.length % 5) * 0.15, 1.5, 5);
    const managerRating = clamp(selfRating + ((p.last.length % 3) - 1) * 0.25, 1.5, 5);
    const status = statuses[i % 5];
    const reviewId = randomUUID();
    const mgr = p.managerKey ? byKey.get(p.managerKey) : undefined;
    reviews.push({
      id: reviewId,
      cycleId: cycle.id,
      employeeId: p.empId,
      reviewerId: mgr?.empId ?? null,
      status,
      selfSummary:
        status === "SELF_IN_PROGRESS"
          ? ""
          : `This cycle I focused on delivery quality and client communication. Utilization closed near ${p.util}%.`,
      managerSummary: ["MANAGER_SUBMITTED", "CALIBRATED"].includes(status)
        ? `${p.first} is a solid contributor. Continue stretching on independent client conversations.`
        : "",
      selfRating: status === "SELF_IN_PROGRESS" ? null : Number(selfRating.toFixed(1)),
      managerRating: ["MANAGER_SUBMITTED", "CALIBRATED"].includes(status) ? Number(managerRating.toFixed(1)) : null,
      finalRating: status === "CALIBRATED" ? Number(managerRating.toFixed(1)) : null,
    });
    for (const name of COMPETENCIES) {
      scores.push({
        id: randomUUID(),
        reviewId,
        name,
        selfScore: status === "SELF_IN_PROGRESS" ? null : ratingLabel(selfRating + (name.length % 3) * 0.1),
        managerScore: ["MANAGER_SUBMITTED", "CALIBRATED"].includes(status)
          ? ratingLabel(managerRating + (name.length % 2) * 0.1)
          : null,
      });
    }
  }

  await prisma.goal.createMany({ data: goals });
  await prisma.review.createMany({ data: reviews });
  await prisma.competencyScore.createMany({ data: scores });

  const diya = byKey.get("employee")!;
  const rohan = byKey.get("manager")!;
  const ananya = byKey.get("hr")!;
  const peers = planned.filter((p) => p.deptIndex === 2 && p.key !== "employee").slice(0, 6);

  await prisma.feedback.createMany({
    data: [
      {
        fromId: rohan.userId,
        toId: diya.userId,
        type: "PRAISE",
        message:
          "Diya ran the steering update without notes. Client sponsor called it the clearest status they have had this quarter.",
      },
      {
        fromId: ananya.userId,
        toId: diya.userId,
        type: "COACHING",
        message: "Consider documenting estimation assumptions so the next squad can reuse them.",
      },
      {
        fromId: diya.userId,
        toId: rohan.userId,
        type: "PEER",
        message: "Rohan unblocked a staffing conflict in one conversation. Sharing so it is visible in his file.",
      },
      ...peers.map((peer, i) => ({
        fromId: peer.userId,
        toId: diya.userId,
        type: i % 2 === 0 ? "PRAISE" : "PEER",
        message:
          i % 2 === 0
            ? "Reliable on review turnaround. Helped me land the workshop agenda on time."
            : "Good pairing partner on the migration runbook.",
      })),
    ],
  });

  console.log(`Seeded ${planned.length} employees for ${cycle.name}.`);
  console.log("Create matching Clerk users (same emails). After first sign-in, clerkId is linked automatically.");
  console.log("  employee@helix.consulting  EMPLOYEE  Diya Patel");
  console.log("  manager@helix.consulting   MANAGER   Rohan Desai");
  console.log("  hr@helix.consulting        HR        Ananya Iyer");
  console.log("  admin@helix.consulting     ADMIN     Kabir Shah");
  console.log("  ceo@helix.consulting       ADMIN     Leela Menon");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
