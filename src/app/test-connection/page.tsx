import { supabaseServer } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type EmployeeRow = Record<string, unknown>;

export default async function TestConnectionPage() {
  let rows: EmployeeRow[] = [];
  let errorMessage: string | null = null;

  try {
    const { data, error } = await supabaseServer().from("employees").select("*");
    if (error) {
      errorMessage = error.message;
    } else {
      rows = data ?? [];
    }
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "Unknown error";
  }

  return (
    <main className="min-h-screen max-w-3xl mx-auto px-6 py-10">
      <p className="text-xs uppercase tracking-wide text-[#3d4f56]">Temporary</p>
      <h1 className="serif text-3xl mt-2">Supabase connection test</h1>
      <p className="mt-2 text-sm text-[#3d4f56]">
        Reads every row from <code>employees</code>. Delete <code>/test-connection</code> when you are done.
      </p>

      {errorMessage ? (
        <p className="mt-8 text-sm text-red-800">Could not read employees: {errorMessage}</p>
      ) : rows.length === 0 ? (
        <p className="mt-8 text-sm text-[#3d4f56]">Connected. The employees table has no rows yet.</p>
      ) : (
        <ul className="mt-8 space-y-3">
          {rows.map((row, index) => (
            <li
              key={typeof row.id === "string" ? row.id : `row-${index}`}
              className="rounded-md border border-[#d8cfc0] bg-white p-4 text-sm"
            >
              <p className="font-medium">{String(row.full_name ?? row.email ?? row.id ?? `Row ${index + 1}`)}</p>
              <pre className="mt-2 overflow-x-auto text-xs text-[#3d4f56]">{JSON.stringify(row, null, 2)}</pre>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
