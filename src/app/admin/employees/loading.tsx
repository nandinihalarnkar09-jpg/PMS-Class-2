export default function AdminEmployeesLoading() {
  return (
    <main className="min-h-screen bg-[#f4efe6] px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="serif text-3xl text-[#162329]">Employees</h1>
        <p className="mt-2 text-sm text-[#3d4f56]">Loading employees…</p>
        <div className="mt-8 overflow-hidden rounded-xl border border-[#d8cfc0] bg-white">
          <div className="h-10 animate-pulse bg-[#ece6dc]" />
          <div className="space-y-2 p-4">
            <div className="h-8 animate-pulse rounded bg-[#f4efe6]" />
            <div className="h-8 animate-pulse rounded bg-[#f4efe6]" />
            <div className="h-8 animate-pulse rounded bg-[#f4efe6]" />
          </div>
        </div>
      </div>
    </main>
  );
}
