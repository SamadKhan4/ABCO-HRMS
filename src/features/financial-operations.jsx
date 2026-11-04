import React from "react";
import { useQuery } from "@tanstack/react-query";
import ResourcePage, { person, currency } from "../components/ResourcePage";
import { get, errorMessage } from "../api";
const f = (name, label, type = "text", extra = {}) => ({
    name,
    label,
    type,
    ...extra,
  }),
  select = (name, label, options) => f(name, label, "select", { options });
const status = { label: "Status", key: "status", status: true },
  employee = { label: "Employee", render: (r) => person(r.employee) };
const componentRows = (name, label) =>
  f(name, label, "array", {
    itemLabel: "component",
    fields: [f("name", "Component name"), f("amount", "Approved amount (INR)")],
  });
function LoanHistory({ record }) {
  const query = useQuery({
    queryKey: ["loan-recoveries", record._id],
    queryFn: () => get(`/loans/${record._id}/recoveries`),
  });
  return (
    <section className="loan-history">
      <h2>Recovery history</h2>
      {query.error && <div className="notice">{errorMessage(query.error)}</div>}
      {query.data?.data.length ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>MONTH</th>
                <th>AMOUNT</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {query.data.data.map((item) => (
                <tr key={item._id}>
                  <td>{item.month}</td>
                  <td>{currency(item.amount)}</td>
                  <td>{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>No recovery allocations yet.</p>
      )}
    </section>
  );
}
export function financialConfigs() {
  return {
    "loan-policies": {
      title: "Loan & advance policies",
      description:
        "Explicitly approved limits and repayment terms. No interest rate is assumed.",
      endpoint: "/loan-policies",
      create: "Create loan / advance policy",
      permission: "payroll.process",
      fields: [
        f("name", "Policy name"),
        select("type", "Policy type", ["Loan", "Salary Advance"]),
        f("maximumAmount", "Maximum principal (INR)"),
        f("maximumInstallments", "Maximum payroll installments", "number", {
          min: 1,
          max: 120,
        }),
        f("interestPercent", "One-time flat interest (%)", "number", {
          min: 0,
          max: 100,
          step: 0.01,
        }),
      ],
      prepare: (input) => ({
        ...input,
        flatInterestBasisPoints: Math.round(input.interestPercent * 100),
      }),
      columns: [
        { label: "Policy", key: "name" },
        { label: "Type", key: "type" },
        { label: "Maximum amount", render: (r) => currency(r.maximumAmount) },
        { label: "Maximum installments", key: "maximumInstallments" },
        {
          label: "Flat interest",
          render: (r) => `${r.flatInterestBasisPoints / 100}%`,
        },
      ],
      actions: [
        {
          label: "Deactivate policy",
          endpoint: "deactivate",
          permission: "payroll.process",
          fields: [],
        },
      ],
    },
    loans: {
      title: "Loans & salary advances",
      description:
        "Requests, approved payment records and traceable payroll recovery.",
      endpoint: "/loans",
      create: "Request loan / advance",
      needsLoanPolicies: true,
      note: "A calculated payroll reserves an installment. Recovery is posted only when payroll is finalized. Payment actions record an external payment; they do not transfer funds.",
      fields: [
        f("policy", "Approved policy", "select", { source: "loanPolicies" }),
        f("amount", "Requested principal (INR)"),
        f("installments", "Number of installments", "number", {
          min: 1,
          max: 120,
        }),
        f("startMonth", "First repayment month", "month"),
        f("reason", "Reason", "textarea", { full: true }),
      ],
      columns: [
        employee,
        { label: "Policy", render: (r) => r.policySnapshot.name },
        { label: "Total agreed repayment", render: (r) => currency(r.total) },
        { label: "Recovered", render: (r) => currency(r.repaid) },
        { label: "Reserved in payroll", render: (r) => currency(r.reserved) },
        status,
      ],
      actions: [
        {
          label: "Review request",
          endpoint: "review",
          permission: "payroll.approve",
          when: (r, u) =>
            r.status === "Requested" && r.employee?._id !== u.employee,
          fields: [
            select("status", "Decision", ["Approved", "Rejected"]),
            f("note", "Review note", "textarea"),
          ],
        },
        {
          label: "Record disbursement",
          endpoint: "disburse",
          permission: "payroll.release",
          when: (r) => r.status === "Approved",
          fields: [f("paymentReference", "Payment reference")],
        },
      ],
      detailContent: (record) => <LoanHistory record={record} />,
    },
    "final-settlements": {
      title: "Full & final settlements",
      description:
        "Reviewed components, loan clearance and approved encashment in an immutable payment record.",
      endpoint: "/final-settlements",
      edit: {
        permission: "payroll.process",
        when: (r) => r.status === "Draft",
        initial: (r) => ({
          exit: r.exit,
          earnings: (r.manualEarnings?.length
            ? r.manualEarnings
            : r.earnings.filter((c) => c.name !== "Approved leave encashment")
          ).map((c) => ({ ...c, amount: (c.amount / 100).toFixed(2) })),
          deductions: (r.manualDeductions?.length
            ? r.manualDeductions
            : r.deductions.filter(
                (c) =>
                  !c.name.startsWith("Final loan recovery") &&
                  !c.name.startsWith("Final salary advance recovery"),
              )
          ).map((c) => ({ ...c, amount: (c.amount / 100).toFixed(2) })),
          includeOutstandingLoans: true,
          includeApprovedEncashments: true,
          reason: r.reason,
        }),
      },
      create: "Prepare settlement",
      permission: "payroll.process",
      needsSettlementExits: true,
      note: "Enter amounts authorized under your company’s applicable policies. Statutory entitlements and tax rates are not assumed.",
      fields: [
        f("exit", "Approved exit", "select", { source: "settlementExits" }),
        componentRows("earnings", "Settlement earnings"),
        componentRows("deductions", "Settlement deductions"),
        f(
          "includeOutstandingLoans",
          "Include outstanding tracked loans",
          "checkbox",
        ),
        f(
          "includeApprovedEncashments",
          "Include approved unpaid leave encashment",
          "checkbox",
        ),
        f("reason", "Calculation and policy reference", "textarea", {
          full: true,
        }),
      ],
      initial: {
        earnings: [{ name: "", amount: "" }],
        deductions: [],
        includeOutstandingLoans: false,
        includeApprovedEncashments: false,
      },
      columns: [
        employee,
        {
          label: "Last working day",
          render: (r) => r.employeeSnapshot.lastWorkingDate,
        },
        { label: "Earnings", render: (r) => currency(r.gross) },
        { label: "Deductions", render: (r) => currency(r.deductionsTotal) },
        { label: "Net settlement", render: (r) => currency(r.net) },
        status,
      ],
      actions: [
        {
          label: "Approve settlement",
          endpoint: "approve",
          permission: "payroll.approve",
          when: (r, u) =>
            r.status === "Draft" &&
            r.createdBy !== u.id &&
            r.employee?._id !== u.employee,
          fields: [],
        },
        {
          label: "Reopen for correction",
          endpoint: "reopen",
          permission: "payroll.process",
          when: (r) => r.status === "Approved",
          fields: [f("reason", "Reason for reopening", "textarea")],
        },
        {
          label: "Record payment",
          endpoint: "pay",
          permission: "payroll.release",
          when: (r) => r.status === "Approved",
          fields: [f("paymentReference", "Payment reference")],
        },
      ],
    },
  };
}
export default function FinancialOperations({ module, user }) {
  return <ResourcePage config={financialConfigs()[module]} user={user} />;
}
