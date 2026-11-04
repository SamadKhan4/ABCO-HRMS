import React, { useState } from "react";
import ResourcePage, {
  can,
  person,
  currency,
  employeeField,
  download,
  Dialog,
} from "../components/ResourcePage";
import { useQuery } from "@tanstack/react-query";
import { get } from "../api";
const f = (name, label, type = "text", extra = {}) => ({
  name,
  label,
  type,
  ...extra,
});
const components = (name, label) =>
  f(name, label, "array", {
    itemLabel: "component",
    fields: [
      f("name", "Component name"),
      f("amount", "Monthly amount (INR)", "text", {
        help: "Up to 2 decimal places",
      }),
      f("prorate", "Prorate by payable days", "checkbox", {}),
    ],
  });
const status = { label: "Status", key: "status", status: true };
function Entries({ period, onClose }) {
  const query = useQuery({
    queryKey: ["payroll-entries", period._id],
    queryFn: () => get(`/payroll/periods/${period._id}/entries?limit=100`),
  });
  return (
    <Dialog title={`Payroll register · ${period.month}`} onClose={onClose}>
      {query.isPending ? (
        <p>Loading payroll entries…</p>
      ) : query.error ? (
        <p role="alert">Unable to load payroll register.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>EMPLOYEE</th>
                <th>DAYS</th>
                <th>GROSS</th>
                <th>DEDUCTIONS</th>
                <th>NET</th>
              </tr>
            </thead>
            <tbody>
              {query.data.data.map((entry) => (
                <tr key={entry._id}>
                  <td>{entry.employeeSnapshot.name}</td>
                  <td>
                    {entry.payableDays}/{entry.periodDays}
                  </td>
                  <td>{currency(entry.gross)}</td>
                  <td>{currency(entry.deductionsTotal)}</td>
                  <td>{currency(entry.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Dialog>
  );
}
export default function Payroll({ user }) {
  const privileged = can(user, "payroll.view");
  const [tab, setTab] = useState(privileged ? "periods" : "payslips"),
    [period, setPeriod] = useState(null);
  const salary = {
    title: "Salary structures",
    description:
      "Effective-dated compensation with explicit, configured earnings and deductions.",
    endpoint: "/salary-structures",
    create: "Assign salary structure",
    permission: "payroll.process",
    note: "Enter approved monthly amounts. No statutory tax rates or eligibility rules are assumed. Revisions start on the first of a month.",
    fields: [
      employeeField,
      f("effectiveDate", "Effective from", "date"),
      f("overtimeRate", "Overtime rate per hour (INR, 0 to disable)"),
      components("earnings", "Earnings"),
      components("deductions", "Deductions"),
      components("employerContributions", "Employer contributions"),
    ],
    initial: {
      overtimeRate: "0",
      earnings: [{ name: "Basic salary", amount: "", prorate: true }],
      deductions: [],
      employerContributions: [],
    },
    columns: [
      { label: "Employee", render: (r) => person(r.employee) },
      { label: "Effective date", key: "effectiveDate" },
      {
        label: "Monthly earnings",
        render: (r) =>
          currency(r.earnings.reduce((sum, c) => sum + c.amount, 0)),
      },
      {
        label: "Monthly deductions",
        render: (r) =>
          currency(r.deductions.reduce((sum, c) => sum + c.amount, 0)),
      },
    ],
  };
  const periods = {
    title: "Payroll",
    description: "From verified inputs to approved, immutable payslips.",
    endpoint: "/payroll/periods",
    create: "Create payroll period",
    permission: "payroll.process",
    note: "Payroll must be calculated after the month ends. A second authorized person must approve the calculation. Recording payment does not transfer funds.",
    fields: [
      f("month", "Pay month", "month"),
      f("payBasis", "Pay basis", "select", {
        options: ["Calendar days", "Recorded attendance"],
      }),
    ],
    columns: [
      { label: "Pay period", key: "month" },
      { label: "Pay basis", key: "payBasis" },
      status,
      { label: "Version", key: "version" },
    ],
    actions: [
      {
        label: "Download all payslips",
        permission: "payroll.view",
        when: (r) => ["Finalized", "Paid", "Closed"].includes(r.status),
        run: (record) =>
          download(
            `/payroll/periods/${record._id}/payslips`,
            `payslips-${record.month}.zip`,
          ),
      },
      {
        label: "Reopen for correction",
        endpoint: "reopen",
        permission: "payroll.process",
        when: (r) => ["Calculated", "Under Review"].includes(r.status),
        fields: [f("reason", "Reason for correction", "textarea")],
      },
      {
        label: "Bank payment statement",
        permission: "payroll.release",
        when: (r) => ["Finalized", "Paid", "Closed"].includes(r.status),
        run: (record) =>
          download(
            `/payroll/periods/${record._id}/bank-statement`,
            `ABCO-bank-statement-${record.month}.csv`,
          ),
      },
      {
        label: "View entries",
        run: (record) => setPeriod(record),
        when: (r) => r.status !== "Draft",
      },
      ...Object.entries({
        Draft: ["Calculate", "calculate", "payroll.process"],
        Calculated: ["Submit for review", "submit", "payroll.process"],
        "Under Review": ["Approve", "approve", "payroll.approve"],
        Approved: ["Finalize & release", "finalize", "payroll.release"],
        Finalized: ["Record payment", "pay", "payroll.release"],
        Paid: ["Close period", "close", "payroll.release"],
      }).map(([state, [label, endpoint, permission]]) => ({
        label,
        endpoint,
        permission,
        when: (r) => r.status === state,
        fields:
          endpoint === "pay"
            ? [f("paymentReference", "Payment reference")]
            : [],
      })),
    ],
  };
  const adjustments = {
    title: "Payroll adjustments",
    description:
      "Approved variable earnings and recoveries are applied once to the selected month.",
    endpoint: "/payroll-adjustments",
    create: "Create adjustment",
    permission: "payroll.process",
    fields: [
      employeeField,
      f("month", "Target payroll month", "month"),
      f("category", "Category", "select", {
        options: [
          "Incentive",
          "Bonus",
          "Arrears",
          "Advance Recovery",
          "Loan Deduction",
          "Correction",
          "Other",
        ],
      }),
      f("name", "Payslip component name"),
      f("type", "Type", "select", { options: ["Earning", "Deduction"] }),
      f("amount", "Amount (INR)"),
      f("reason", "Reason", "textarea", { full: true }),
    ],
    columns: [
      { label: "Employee", render: (r) => person(r.employee) },
      { label: "Month", key: "month" },
      { label: "Component", key: "name" },
      { label: "Type", key: "type" },
      { label: "Amount", render: (r) => currency(r.amount) },
      status,
    ],
    actions: [
      {
        label: "Review adjustment",
        endpoint: "review",
        permission: "payroll.approve",
        when: (r, u) => r.status === "Pending" && r.createdBy !== u.id,
        fields: [
          f("status", "Decision", "select", {
            options: ["Approved", "Rejected"],
          }),
        ],
      },
    ],
  };
  const payslips = {
    title: "My payslips",
    description:
      "Your salary statements, securely available whenever you need them.",
    endpoint: "/payslips/me",
    columns: [
      { label: "Period", render: (r) => r.period?.month },
      { label: "Gross", render: (r) => currency(r.gross) },
      { label: "Deductions", render: (r) => currency(r.deductionsTotal) },
      { label: "Net pay", render: (r) => currency(r.net) },
      {
        label: "Payable days",
        render: (r) => `${r.payableDays}/${r.periodDays}`,
      },
    ],
    actions: [
      {
        label: "Download PDF",
        run: (record) =>
          download(
            `/payslips/${record._id}/download`,
            `ABCO-payslip-${record.period.month}.pdf`,
          ),
      },
    ],
  };
  return (
    <>
      <div className="module-tabs">
        {privileged && (
          <>
            <button
              className={tab === "periods" ? "active" : ""}
              onClick={() => setTab("periods")}
            >
              Payroll runs
            </button>
            <button
              className={tab === "salary" ? "active" : ""}
              onClick={() => setTab("salary")}
            >
              Salary structures
            </button>
            <button
              className={tab === "adjustments" ? "active" : ""}
              onClick={() => setTab("adjustments")}
            >
              Adjustments
            </button>
          </>
        )}
        <button
          className={tab === "payslips" ? "active" : ""}
          onClick={() => setTab("payslips")}
        >
          My payslips
        </button>
      </div>
      <ResourcePage
        key={tab}
        config={
          tab === "salary"
            ? salary
            : tab === "periods"
              ? periods
              : tab === "adjustments"
                ? adjustments
                : payslips
        }
        user={user}
      />
      {period && <Entries period={period} onClose={() => setPeriod(null)} />}
    </>
  );
}
