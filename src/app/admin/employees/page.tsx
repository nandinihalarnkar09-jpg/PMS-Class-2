import { supabaseServer } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export type EmployeeRole = "employee" | "manager" | "hr_admin";

export type EmployeeRow = {
  id: string;
  full_name: string;
  designation: string;
  department: string;
  manager_id: string | null;
  role: EmployeeRole;
  is_active: boolean;
  manager: { full_name: string } | { full_name: string }[] | null;
};

function managerName(row: EmployeeRow) {
  const manager = row.manager;
  if (!manager) return "—";
  if (Array.isArray(manager)) return manager[0]?.full_name ?? "—";
  return manager.full_name ?? "—";
}

function roleLabel(role: EmployeeRole) {
  if (role === "hr_admin") return "HR admin";
  if (role === "manager") return "Manager";
  return "Employee";
}

export default async function AdminEmployeesPage() {
  const { data, error } = await supabaseServer()
    .from("employees")
    .select(
      "id, full_name, designation, department, manager_id, role, is_active, manager:employees!manager_id(full_name)",
    )
    .order("full_name", { ascending: true })
    .returns<EmployeeRow[]>();

  const rows = data ?? [];

  return (
    <main className="min-h-screen bg-[#f4efe6] px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="serif text-3xl text-[#162329]">Employees</h1>
        <p className="mt-2 text-sm text-[#3d4f56]">Everyone in the Helix directory.</p>

        {error ? (
          <p className="mt-8 text-sm text-red-800">Could not load employees.</p>
        ) : rows.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-[#d8cfc0] bg-white px-6 py-16 text-center">
            <p className="font-medium text-[#162329]">No employees yet</p>
            <p className="mt-2 text-sm text-[#3d4f56]">
              When people are added to the employees table, they will show up here.
            </p>
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto rounded-xl border border-[#d8cfc0] bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f4efe6] text-[#3d4f56]">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Designation</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Manager</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ece6dc]">
                {rows.map((row) => (
                  <tr key={row.id} className="text-[#162329]">
                    <td className="px-4 py-3 font-medium">{row.full_name}</td>
                    <td className="px-4 py-3">{row.designation}</td>
                    <td className="px-4 py-3">{row.department}</td>
                    <td className="px-4 py-3">{managerName(row)}</td>
                    <td className="px-4 py-3">{roleLabel(row.role)}</td>
                    <td className="px-4 py-3">{row.is_active ? "Active" : "Inactive"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
