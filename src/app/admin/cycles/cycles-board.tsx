"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createReviewCycle, setCycleStatus, type CycleStatus, type ReviewCycleRow } from "./cycle-actions";

const fieldClass =
  "mt-1 w-full rounded-md border border-[#d8cfc0] bg-white px-3 py-2 text-sm text-[#162329]";

const STATUSES: CycleStatus[] = ["draft", "open", "closed"];

export function CyclesBoard({ cycles }: { cycles: ReviewCycleRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !startDate || !endDate) {
      setError("Name, start date, and end date are required.");
      return;
    }
    setPending(true);
    setError("");
    const result = await createReviewCycle({
      name,
      start_date: startDate,
      end_date: endDate,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setName("");
    setStartDate("");
    setEndDate("");
    router.refresh();
  }

  async function onStatus(cycle: ReviewCycleRow, status: CycleStatus) {
    if (status === cycle.status) return;
    if (status === "open") {
      const openCycle = cycles.find((row) => row.status === "open" && row.id !== cycle.id);
      if (openCycle) {
        const ok = window.confirm(
          `"${openCycle.name}" is already open. Close it and open "${cycle.name}" instead?`,
        );
        if (!ok) return;
      }
    }
    setPending(true);
    setError("");
    const result = await setCycleStatus(cycle.id, status);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-8 space-y-8">
      <form onSubmit={onCreate} className="rounded-xl border border-[#d8cfc0] bg-white p-5" noValidate>
        <h2 className="font-medium text-[#162329]">Create review cycle</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="text-sm text-[#3d4f56] sm:col-span-3">
            Name
            <input
              className={fieldClass}
              value={name}
              onChange={(event) => setName(event.target.value)}
              name="name"
            />
          </label>
          <label className="text-sm text-[#3d4f56]">
            Start date
            <input
              className={fieldClass}
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              name="start_date"
            />
          </label>
          <label className="text-sm text-[#3d4f56]">
            End date
            <input
              className={fieldClass}
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              name="end_date"
            />
          </label>
        </div>
        {error ? <p className="mt-3 text-sm text-red-800">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="mt-4 rounded-md bg-[#162329] px-4 py-2 text-sm text-[#f4efe6] disabled:opacity-60"
        >
          {pending ? "Saving…" : "Create cycle"}
        </button>
      </form>

      {cycles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#d8cfc0] bg-white px-6 py-16 text-center">
          <p className="font-medium text-[#162329]">No review cycles yet</p>
          <p className="mt-2 text-sm text-[#3d4f56]">Create a draft cycle to start an appraisal window.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {cycles.map((cycle) => (
            <li
              key={cycle.id}
              className="flex flex-col gap-3 rounded-xl border border-[#d8cfc0] bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-[#162329]">{cycle.name}</p>
                <p className="mt-1 text-sm text-[#3d4f56]">
                  {cycle.start_date} → {cycle.end_date}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((status) => (
                  <button
                    key={status}
                    type="button"
                    disabled={pending}
                    onClick={() => onStatus(cycle, status)}
                    className={
                      cycle.status === status
                        ? "rounded-md bg-[#162329] px-3 py-1.5 text-sm text-[#f4efe6]"
                        : "rounded-md border border-[#d8cfc0] bg-white px-3 py-1.5 text-sm text-[#162329]"
                    }
                  >
                    {status}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
