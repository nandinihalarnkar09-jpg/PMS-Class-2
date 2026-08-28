import { supabaseServer } from "@/lib/supabase";
import { CyclesBoard } from "./cycles-board";
import type { ReviewCycleRow } from "./cycle-actions";

export const dynamic = "force-dynamic";

export default async function AdminCyclesPage() {
  const { data, error } = await supabaseServer()
    .from("review_cycles")
    .select("id, name, start_date, end_date, status, created_by")
    .order("start_date", { ascending: false })
    .returns<ReviewCycleRow[]>();

  return (
    <main className="min-h-screen bg-[#f4efe6] px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="serif text-3xl text-[#162329]">Review cycles</h1>
        <p className="mt-2 text-sm text-[#3d4f56]">
          Only one cycle can be open. Opening another closes the one that is open.
        </p>
        {error ? (
          <p className="mt-8 text-sm text-red-800">Could not load review cycles.</p>
        ) : (
          <CyclesBoard cycles={data ?? []} />
        )}
      </div>
    </main>
  );
}
