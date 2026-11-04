import React from "react";
import { useQuery } from "@tanstack/react-query";
import ResourcePage, { can, person } from "../components/ResourcePage";
import { get } from "../api";
const f = (name, label, type = "text", extra = {}) => ({
  name,
  label,
  type,
  ...extra,
});
export default function ShiftSwaps({ user }) {
  const options = useQuery({
    queryKey: ["attendance-options"],
    queryFn: () => get("/attendance/options"),
  });
  const enabled = options.data?.data.shiftSwapsAllowed === true;
  const party = (record, user) =>
    [record.employee?._id, record.otherEmployee?._id].includes(user.employee);
  const config = {
    title: "Shift swap requests",
    description:
      "Colleague consent and authorized approval, with original schedules preserved.",
    endpoint: "/shift-swaps",
    create: enabled ? "Request a shift swap" : null,
    needsSwapColleagues: enabled,
    note: enabled
      ? "Swaps apply to one workday, within the same branch and timezone. Started or payroll-locked workdays cannot be changed."
      : "New shift swaps are disabled until an administrator enables the company policy.",
    fields: [
      f("otherEmployee", "Colleague", "select", { source: "swapColleagues" }),
      f("date", "Workday", "date"),
      f("reason", "Reason", "textarea", { full: true }),
    ],
    columns: [
      { label: "Requested by", render: (r) => person(r.employee) },
      { label: "Colleague", render: (r) => person(r.otherEmployee) },
      { label: "Workday", key: "date" },
      { label: "Status", key: "status", status: true },
    ],
    actions: [
      {
        label: "Respond to request",
        endpoint: "respond",
        when: (r, u) =>
          r.status === "Requested" && r.otherEmployee?._id === u.employee,
        fields: [
          f("decision", "Response", "select", {
            options: ["Accept", "Decline"],
          }),
          f("reason", "Response note", "textarea"),
        ],
        prepare: (input) => ({
          accept: input.decision === "Accept",
          reason: input.reason,
        }),
      },
      {
        label: "Review swap",
        endpoint: "review",
        when: (r, u) =>
          r.status === "Accepted" &&
          !party(r, u) &&
          (can(u, "shifts.approve") || can(u, "attendance.manage")),
        fields: [
          f("decision", "Decision", "select", {
            options: ["Approve", "Reject"],
          }),
          f("reason", "Review reason", "textarea"),
        ],
        prepare: (input) => ({
          approve: input.decision === "Approve",
          reason: input.reason,
        }),
      },
      {
        label: "Cancel request",
        endpoint: "cancel",
        when: (r, u) =>
          ["Requested", "Accepted"].includes(r.status) &&
          r.employee?._id === u.employee,
        fields: [],
      },
      {
        label: "Reverse approved swap",
        endpoint: "reverse",
        permission: "attendance.manage",
        when: (r) => r.status === "Approved",
        fields: [f("reason", "Reason for reversal", "textarea")],
      },
    ],
  };
  return <ResourcePage config={config} user={user} />;
}
