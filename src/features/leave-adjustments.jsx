import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ResourcePage, {
  ResourceForm,
  can,
  person,
  currency,
  employeeField,
} from "../components/ResourcePage";
import { api, get } from "../api";
export default function LeaveAdjustments({ user }) {
  const [requesting, setRequesting] = useState(false);
  const policies = useQuery({
    queryKey: ["leave-policies"],
    queryFn: () => get("/leave-policies"),
  });
  const qc = useQueryClient();
  const options = (policies.data?.data || []).map((policy) => ({
    value: policy._id,
    label: policy.name,
  }));
  const fields = [
    { name: "policy", label: "Leave policy", type: "select", options },
    {
      name: "year",
      label: "Calendar year",
      type: "number",
      min: 2000,
      max: 2200,
    },
    {
      name: "days",
      label: "Days",
      type: "number",
      step: 0.5,
      min: -366,
      max: 366,
    },
    { name: "reason", label: "Reason", type: "textarea", full: true },
  ];
  const config = {
    title: "Leave adjustments & encashment",
    description:
      "Explicit balance changes, reviewed entitlements and recorded payments.",
    endpoint: "/leave-adjustments",
    create: "Adjust leave balance",
    permission: "leave.manage",
    fields: [employeeField, ...fields],
    initial: { year: new Date().getFullYear() },
    columns: [
      { label: "Employee", render: (r) => person(r.employee) },
      { label: "Policy", render: (r) => r.policy?.name },
      { label: "Type", key: "kind" },
      { label: "Year", key: "year" },
      { label: "Days", key: "days" },
      {
        label: "Value",
        render: (r) => (r.amount == null ? "—" : currency(r.amount)),
      },
      { label: "Status", key: "status", status: true },
    ],
    actions: [
      {
        label: "Review encashment",
        endpoint: (r) => `/leave-encashments/${r._id}/review`,
        permission: "leave.manage",
        when: (r, u) =>
          r.kind === "Encashment" &&
          r.status === "Pending" &&
          r.employee?._id !== u.employee,
        fields: [
          {
            name: "status",
            label: "Decision",
            type: "select",
            options: ["Approved", "Rejected"],
          },
          { name: "amount", label: "Approved amount (INR)" },
          { name: "reason", label: "Review reason", type: "textarea" },
        ],
      },
      {
        label: "Record payment",
        endpoint: (r) => `/leave-encashments/${r._id}/pay`,
        permission: "payroll.release",
        when: (r) => r.kind === "Encashment" && r.status === "Approved",
        fields: [{ name: "paymentReference", label: "Payment reference" }],
      },
    ],
  };
  return (
    <>
      <div className="module-tabs">
        <button className="secondary" onClick={() => setRequesting(true)}>
          Request leave encashment
        </button>
      </div>
      <ResourcePage config={config} user={user} />
      {requesting && (
        <ResourceForm
          title="Request leave encashment"
          fields={fields.map((field) =>
            field.name === "policy"
              ? {
                  ...field,
                  options: (policies.data?.data || [])
                    .filter((policy) => policy.encashmentAllowed)
                    .map((policy) => ({
                      value: policy._id,
                      label: policy.name,
                    })),
                }
              : field.name === "days"
                ? { ...field, min: 0.5 }
                : field,
          )}
          initial={{ year: new Date().getFullYear() }}
          onClose={() => setRequesting(false)}
          onSubmit={async (input) => {
            await api.post("/leave-encashments", input);
            await qc.invalidateQueries();
          }}
        />
      )}
    </>
  );
}
