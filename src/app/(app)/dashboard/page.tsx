import { requireEmployee } from "@/lib/current-employee";

export default async function DashboardPage() {
  const employee = await requireEmployee();

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.22em] text-[#3d4f56]">{employee.role.replace("_", " ")}</p>
      <h1 className="serif mt-2 text-4xl">Hello, {employee.full_name}.</h1>
      <p className="mt-2 max-w-xl text-[#3d4f56]">
        {employee.designation} · {employee.department}
      </p>
    </div>
  );
}
