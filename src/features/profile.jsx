import BankDetails from "./bank-details";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { api, get, errorMessage } from "../api";
import { ResourceForm } from "../components/ResourcePage";
export default function Profile() {
  const query = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => get("/employees/me"),
  });
  if (query.isPending) return <p>Loading your profile…</p>;
  if (query.error)
    return <div className="notice">{errorMessage(query.error)}</div>;
  if (!query.data.data) return <p>Ask HR to link your employee profile.</p>;
  return (
    <>
      <ProfileForm employee={query.data.data} />
      <BankDetails />
    </>
  );
}
function ProfileForm({ employee }) {
  const { register, handleSubmit } = useForm({ defaultValues: employee });
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input) => api.patch("/employees/me/profile", input),
    onSuccess: () => qc.invalidateQueries(),
  });
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR PEOPLE PROFILE</span>
          <h1>My profile</h1>
          <p>
            {employee.firstName} {employee.lastName} · {employee.code} ·{" "}
            {employee.designation}
          </p>
        </div>
      </div>
      <section className="panel settings-panel">
        <h2>Personal & emergency contact</h2>
        <form
          onSubmit={handleSubmit((input) =>
            mutation.mutate({
              phone: input.phone,
              address: input.address || "",
              dateOfBirth: input.dateOfBirth || "",
              emergencyContact: input.emergencyContact,
            }),
          )}
        >
          <div className="form-grid">
            <label>
              Phone
              <input type="tel" {...register("phone")} />
            </label>
            <label>
              Date of birth
              <input type="date" {...register("dateOfBirth")} />
            </label>
            <label className="full">
              Address
              <textarea {...register("address")} />
            </label>
            <label>
              Emergency contact name
              <input {...register("emergencyContact.name")} />
            </label>
            <label>
              Emergency contact phone
              <input type="tel" {...register("emergencyContact.phone")} />
            </label>
            <label>
              Relationship
              <input {...register("emergencyContact.relationship")} />
            </label>
          </div>
          {mutation.isError && (
            <div className="notice">{errorMessage(mutation.error)}</div>
          )}
          {mutation.isSuccess && (
            <div className="success-note">Profile updated.</div>
          )}
          <div className="form-footer">
            <button className="primary" disabled={mutation.isPending}>
              Save my details
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
export function EmployeeOrganization({ employee, onClose }) {
  const qc = useQueryClient();
  const records = useQuery({
    queryKey: ["organization-lookups"],
    queryFn: () => get("/organization-lookups"),
  });
  const people = useQuery({
    queryKey: ["employee-lookups"],
    queryFn: () => get("/lookups/employees"),
  });
  const data = records.data?.data || [];
  const fields = [
    ...["department", "designation", "branch"].map((kind) => ({
      name: kind + "Id",
      label: kind[0].toUpperCase() + kind.slice(1),
      type: "select",
      options: data
        .filter(
          (record) =>
            record.kind === kind + "s" ||
            (kind === "branch" && record.kind === "branches"),
        )
        .map((record) => ({ value: record._id, label: record.name })),
    })),
    {
      name: "manager",
      label: "Reporting manager",
      type: "select",
      required: false,
      options: (people.data?.data || [])
        .filter((p) => p._id !== employee._id)
        .map((p) => ({ value: p._id, label: `${p.firstName} ${p.lastName}` })),
    },
  ];
  return (
    <ResourceForm
      title="Organization assignment"
      fields={fields}
      onClose={onClose}
      onSubmit={async (input) => {
        await api.patch(`/employees/${employee._id}/organization`, {
          ...input,
          manager: input.manager || null,
        });
        await qc.invalidateQueries();
      }}
    />
  );
}
