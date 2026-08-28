import { supabaseServer } from "@/lib/supabase";
import { requireEmployee, type CurrentEmployee } from "@/lib/current-employee";

export const dynamic = "force-dynamic";

const REVIEW_LABEL: Record<string, string> = {
  not_started: "Not started",
  self_appraisal_submitted: "Self-appraisal submitted",
  manager_reviewed: "Manager reviewed",
  completed: "Completed",
};

function Card({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-[#d8cfc0] bg-white px-5 py-4">
      <p className="text-xs uppercase tracking-wide text-[#3d4f56]">{label}</p>
      <p className="serif mt-2 text-3xl text-[#162329]">{value}</p>
      {hint ? <p className="mt-1 text-sm text-[#3d4f56]">{hint}</p> : null}
    </div>
  );
}

function countByStatus(rows: { status: string }[]) {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
  }
  return counts;
}

function goalHint(counts: Record<string, number>) {
  const parts = ["draft", "submitted", "approved", "sent_back"]
    .filter((status) => counts[status])
    .map((status) => `${counts[status]} ${status.replace("_", " ")}`);
  return parts.length ? parts.join(" · ") : "No goals in this cycle yet";
}

async function openCycle() {
  const { data } = await supabaseServer()
    .from("review_cycles")
    .select("id, name")
    .eq("status", "open")
    .limit(1)
    .maybeSingle();
  return data;
}

async function ownCycleCards(me: CurrentEmployee, cycleId: string) {
  const [{ data: goals }, { data: review }] = await Promise.all([
    supabaseServer().from("goals").select("status").eq("employee_id", me.id).eq("cycle_id", cycleId),
    supabaseServer()
      .from("reviews")
      .select("status")
      .eq("employee_id", me.id)
      .eq("cycle_id", cycleId)
      .maybeSingle(),
  ]);

  const goalRows = goals ?? [];
  const counts = countByStatus(goalRows);

  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2">
      <Card label="My goals" value={goalRows.length} hint={goalHint(counts)} />
      <Card
        label="My review"
        value={review ? (REVIEW_LABEL[review.status] ?? review.status) : "Not started"}
        hint={review ? "Open cycle packet" : "No self-appraisal submitted yet"}
      />
    </div>
  );
}

async function teamCards(managerId: string, cycleId: string) {
  const { data: reports } = await supabaseServer().from("employees").select("id").eq("manager_id", managerId);
  const reportIds = (reports ?? []).map((row) => row.id as string);
  const teamSize = reportIds.length;

  if (teamSize === 0) {
    return (
      <div className="mt-10">
        <h2 className="serif text-2xl">Team</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card label="Direct reports" value={0} hint="No one reports to you yet" />
        </div>
      </div>
    );
  }

  const [{ data: goalRows }, { data: reviewRows }] = await Promise.all([
    supabaseServer().from("goals").select("employee_id, status").eq("cycle_id", cycleId).in("employee_id", reportIds),
    supabaseServer().from("reviews").select("employee_id, status").eq("cycle_id", cycleId).in("employee_id", reportIds),
  ]);

  const submitted = new Set<string>();
  const approved = new Set<string>();
  for (const row of goalRows ?? []) {
    if (row.status === "submitted" || row.status === "approved" || row.status === "sent_back") {
      submitted.add(row.employee_id);
    }
    if (row.status === "approved") approved.add(row.employee_id);
  }

  let selfDone = 0;
  let reviewDone = 0;
  for (const row of reviewRows ?? []) {
    if (
      row.status === "self_appraisal_submitted" ||
      row.status === "manager_reviewed" ||
      row.status === "completed"
    ) {
      selfDone += 1;
    }
    if (row.status === "completed") reviewDone += 1;
  }

  return (
    <div className="mt-10">
      <h2 className="serif text-2xl">Team</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card label="Direct reports" value={teamSize} />
        <Card label="Goals submitted" value={submitted.size} hint="At least one submitted plan" />
        <Card label="Goals approved" value={approved.size} hint="At least one approved goal" />
        <Card label="Self-appraisal done" value={selfDone} />
        <Card label="Review completed" value={reviewDone} />
      </div>
    </div>
  );
}

async function hrCards(cycle: { id: string; name: string } | null) {
  const { count: totalEmployees } = await supabaseServer()
    .from("employees")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);

  const total = totalEmployees ?? 0;
  let completed = 0;
  if (cycle && total > 0) {
    const { count } = await supabaseServer()
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("cycle_id", cycle.id)
      .eq("status", "completed");
    completed = count ?? 0;
  }

  const pct = cycle && total > 0 ? `${Math.round((completed / total) * 100)}%` : "—";

  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-3">
      <Card label="Active employees" value={total} />
      <Card label="Open cycle" value={cycle?.name ?? "None"} hint={cycle ? "Currently open" : "HR can open a cycle"} />
      <Card
        label="Completion"
        value={pct}
        hint={cycle ? `${completed} of ${total} reviews completed` : "No open cycle"}
      />
    </div>
  );
}

export default async function DashboardPage() {
  const me = await requireEmployee();
  const cycle = await openCycle();

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.22em] text-[#3d4f56]">{me.role.replace("_", " ")}</p>
      <h1 className="serif mt-2 text-4xl">Hello, {me.full_name}.</h1>
      <p className="mt-2 max-w-xl text-[#3d4f56]">
        {me.designation} · {me.department}
        {cycle ? ` · ${cycle.name}` : ""}
      </p>

      {!cycle && me.role !== "hr_admin" ? (
        <div className="mt-8 rounded-xl border border-dashed border-[#d8cfc0] bg-white px-6 py-16 text-center">
          <p className="font-medium text-[#162329]">No open review cycle</p>
          <p className="mt-2 text-sm text-[#3d4f56]">Cards will fill in when HR opens a cycle.</p>
        </div>
      ) : null}

      {me.role === "hr_admin" ? await hrCards(cycle) : null}

      {me.role !== "hr_admin" && cycle ? await ownCycleCards(me, cycle.id) : null}

      {me.role === "manager" && cycle ? await teamCards(me.id, cycle.id) : null}
    </div>
  );
}
