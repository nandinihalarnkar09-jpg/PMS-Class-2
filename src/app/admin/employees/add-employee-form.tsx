"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createEmployee } from "./create-employee";

type ManagerOption = {
  id: string;
  full_name: string;
};

const fieldClass =
  "mt-1 w-full rounded-md border border-[#d8cfc0] bg-white px-3 py-2 text-sm text-[#162329]";

export function AddEmployeeForm({ managers }: { managers: ManagerOption[] }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState("");
  const [dateOfJoining, setDateOfJoining] = useState("");
  const [managerId, setManagerId] = useState("");
  const [role, setRole] = useState<"employee" | "manager" | "hr_admin">("employee");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = fullName.trim();
    const mail = email.trim();
    if (!name || !mail) {
      setError("Name and email are required.");
      return;
    }

    setPending(true);
    setError("");
    const result = await createEmployee({
      full_name: name,
      email: mail,
      designation,
      department,
      date_of_joining: dateOfJoining,
      manager_id: managerId || null,
      role,
    });
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setFullName("");
    setEmail("");
    setDesignation("");
    setDepartment("");
    setDateOfJoining("");
    setManagerId("");
    setRole("employee");
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-8 rounded-xl border border-[#d8cfc0] bg-white p-5"
      noValidate
    >
      <h2 className="font-medium text-[#162329]">Add employee</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-[#3d4f56]">
          Full name
          <input
            className={fieldClass}
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            name="full_name"
            autoComplete="name"
          />
        </label>
        <label className="text-sm text-[#3d4f56]">
          Email
          <input
            className={fieldClass}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            name="email"
            type="email"
            autoComplete="email"
          />
        </label>
        <label className="text-sm text-[#3d4f56]">
          Designation
          <input
            className={fieldClass}
            value={designation}
            onChange={(event) => setDesignation(event.target.value)}
            name="designation"
          />
        </label>
        <label className="text-sm text-[#3d4f56]">
          Department
          <input
            className={fieldClass}
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
            name="department"
          />
        </label>
        <label className="text-sm text-[#3d4f56]">
          Date of joining
          <input
            className={fieldClass}
            value={dateOfJoining}
            onChange={(event) => setDateOfJoining(event.target.value)}
            name="date_of_joining"
            type="date"
          />
        </label>
        <label className="text-sm text-[#3d4f56]">
          Manager
          <select
            className={fieldClass}
            value={managerId}
            onChange={(event) => setManagerId(event.target.value)}
            name="manager_id"
          >
            <option value="">No manager</option>
            {managers.map((person) => (
              <option key={person.id} value={person.id}>
                {person.full_name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-[#3d4f56]">
          Role
          <select
            className={fieldClass}
            value={role}
            onChange={(event) =>
              setRole(event.target.value as "employee" | "manager" | "hr_admin")
            }
            name="role"
          >
            <option value="employee">employee</option>
            <option value="manager">manager</option>
            <option value="hr_admin">hr_admin</option>
          </select>
        </label>
      </div>
      {error ? <p className="mt-3 text-sm text-red-800">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-md bg-[#162329] px-4 py-2 text-sm text-[#f4efe6] disabled:opacity-60"
      >
        {pending ? "Saving…" : "Add employee"}
      </button>
    </form>
  );
}
