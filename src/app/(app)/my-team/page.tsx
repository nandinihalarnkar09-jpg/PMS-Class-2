import { supabaseServer } from "@/lib/supabase";
import { requireEmployee } from "@/lib/current-employee";

export const dynamic = "force-dynamic";

export default async function MyTeamPage() {
  const me = await requireEmployee();
  if (me.role !== "manager") {
    return <p className="text-sm text-[#3d4f56]">My Team is for managers.</p>;
  }

  const { data } = await supabaseServer()
    .from("employees")
    .select("id, full_name, designation, department, role")
    .eq("manager_id", me.id)
    .order("full_name");

  const reports = data ?? [];

  return (
    <div>
      <h1 className="serif text-3xl">My Team</h1>
      {reports.length === 0 ? (
        <p className="mt-4 text-sm text-[#3d4f56]">No one reports to you yet.</p>
      ) : (
        <ul className="mt-6 space-y-2">
          {reports.map((person) => (
            <li key={person.id} className="rounded-xl border border-[#d8cfc0] bg-white px-4 py-3">
              <p className="font-medium">{person.full_name}</p>
              <p className="text-sm text-[#3d4f56]">
                {person.designation} · {person.department}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
