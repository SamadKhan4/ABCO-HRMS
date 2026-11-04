import NotificationPreferences from "./notification-preferences";
import MFA from "./mfa";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import ResourcePage, {
  Dialog,
  can,
  download,
} from "../components/ResourcePage";
import { api, get, errorMessage } from "../api";

function Company() {
  const query = useQuery({
    queryKey: ["company-settings"],
    queryFn: () => get("/company-settings"),
  });
  if (query.isPending) return <p>Loading company settings…</p>;
  if (query.error)
    return <div className="notice">{errorMessage(query.error)}</div>;
  return (
    <>
      <CompanyForm initial={query.data.data} />
      <CompanyLogo initial={query.data.data.logo} />
    </>
  );
}
function CompanyLogo({ initial }) {
  const qc = useQueryClient(),
    [file, setFile] = useState(null);
  const upload = useMutation({
    mutationFn: () => {
      const data = new FormData();
      data.append("file", file);
      return api.post("/company-logo", data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-settings"] });
      qc.invalidateQueries({ queryKey: ["company-brand"] });
    },
  });
  return (
    <section className="panel settings-panel">
      <h2>Company logo</h2>
      {initial && (
        <img
          src={initial}
          alt="Configured company logo"
          style={{ maxWidth: 200, maxHeight: 100, objectFit: "contain" }}
        />
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          upload.mutate();
        }}
      >
        <label>
          PNG logo (up to 256 KB)
          <input
            required
            type="file"
            accept="image/png"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>
        {upload.error && (
          <div className="notice" role="alert">
            {errorMessage(upload.error)}
          </div>
        )}
        <button className="primary" disabled={!file || upload.isPending}>
          Save company logo
        </button>
      </form>
    </section>
  );
}
function CompanyForm({ initial }) {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      ...initial,
      departments: initial.dailyReportDepartments.join(", "),
    },
  });
  const mutation = useMutation({
    mutationFn: (input) =>
      api.patch("/company-settings", {
        name: input.name,
        address: input.address,
        ...(Number.isInteger(input.financialYearStartMonth)
          ? { financialYearStartMonth: input.financialYearStartMonth }
          : {}),
        timezone: input.timezone,
        requireDailyReport: input.requireDailyReport,
        allowWorkFromHome: input.allowWorkFromHome,
        allowShiftSwaps: input.allowShiftSwaps,
        requireFinalSettlement: input.requireFinalSettlement,
        remindersEnabled: input.remindersEnabled,
        ...(Number.isFinite(input.reminderLeadDays)
          ? { reminderLeadDays: input.reminderLeadDays }
          : {}),
        dailyReportDepartments: input.departments
          .split(",")
          .map((d) => d.trim())
          .filter(Boolean),
      }),
  });
  return (
    <section className="panel settings-panel">
      <h2>Company & workday policy</h2>
      <form onSubmit={handleSubmit((input) => mutation.mutate(input))}>
        <div className="form-grid">
          <label>
            Company name
            <input required {...register("name")} />
          </label>
          <label>
            Timezone
            <input required {...register("timezone")} />
          </label>
          <label className="full">
            Address
            <textarea {...register("address")} />
          </label>
          <label>
            Financial year start month
            <select
              {...register("financialYearStartMonth", { valueAsNumber: true })}
            >
              <option value="">Choose approved financial year</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option value={i + 1} key={i}>
                  {new Intl.DateTimeFormat("en", {
                    month: "long",
                    timeZone: "UTC",
                  }).format(new Date(Date.UTC(2026, i, 1)))}
                </option>
              ))}
            </select>
          </label>
          <label className="full">
            Daily work report before punch-out
            <span className="checkbox-field">
              <input type="checkbox" {...register("requireDailyReport")} />
              Require a submitted report
            </span>
          </label>
          <label className="full">
            Applicable departments
            <input
              {...register("departments")}
              placeholder="Comma-separated; leave blank for all departments"
            />
          </label>
          <label>
            Scheduled reminders
            <span className="checkbox-field">
              <input type="checkbox" {...register("remindersEnabled")} />
              Enable configured reminders
            </span>
          </label>
          <label>
            Work-from-home attendance
            <span className="checkbox-field">
              <input type="checkbox" {...register("allowWorkFromHome")} />
              Allow employees to select work from home
            </span>
          </label>
          <label>
            Finance clearance before exit
            <span className="checkbox-field">
              <input type="checkbox" {...register("requireFinalSettlement")} />
              Require a paid final settlement before completing employee exit
            </span>
          </label>
          <label>
            Employee shift swaps
            <span className="checkbox-field">
              <input type="checkbox" {...register("allowShiftSwaps")} />
              Allow requests subject to colleague consent and HR approval
            </span>
          </label>
          <label>
            Reminder lead time (days)
            <input
              type="number"
              min={1}
              max={365}
              {...register("reminderLeadDays", { valueAsNumber: true })}
            />
          </label>
        </div>
        {mutation.isError && (
          <div className="notice" role="alert">
            {errorMessage(mutation.error)}
          </div>
        )}
        {mutation.isSuccess && (
          <div className="success-note" role="status">
            Company settings saved.
          </div>
        )}
        <div className="form-footer">
          <button className="primary" disabled={mutation.isPending}>
            Save settings
          </button>
        </div>
      </form>
    </section>
  );
}
function Reauthenticate() {
  const [password, setPassword] = useState("");
  const mutation = useMutation({
    mutationFn: () => api.post("/auth/reauthenticate", { password }),
    onSuccess: () => setPassword(""),
  });
  return (
    <form
      className="reauth-form"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <div>
        <strong>Confirm sensitive changes</strong>
        <p>
          Re-enter your password to authorize access changes for the next 5
          minutes.
        </p>
      </div>
      <label className="sr-only" htmlFor="reauth-password">
        Current password
      </label>
      <input
        id="reauth-password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Your current password"
      />
      <button className="secondary" disabled={mutation.isPending}>
        Confirm password
      </button>
      {mutation.isError && (
        <div className="notice" role="alert">
          {errorMessage(mutation.error)}
        </div>
      )}
      {mutation.isSuccess && (
        <span className="success-note" role="status">
          Confirmed
        </span>
      )}
    </form>
  );
}
function Access() {
  const [editing, setEditing] = useState(null);
  const qc = useQueryClient();
  const roles = useQuery({ queryKey: ["roles"], queryFn: () => get("/roles") });
  const permissions = useQuery({
    queryKey: ["permissions"],
    queryFn: () => get("/permissions"),
  });
  return (
    <>
      <Reauthenticate />
      <div className="page-heading">
        <div>
          <h1>Roles & permissions</h1>
          <p>Grant only the access each role needs.</p>
        </div>
        <button
          className="primary"
          onClick={() => setEditing({ name: "", permissions: [] })}
        >
          Create role
        </button>
      </div>
      <section className="panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>ROLE</th>
                <th>PERMISSION GRANTS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {roles.data?.data.map((role) => (
                <tr key={role._id}>
                  <td>{role.name}</td>
                  <td>
                    {role.permissions.includes("*")
                      ? "Full administrator access"
                      : `${role.permissions.length} explicit permissions`}
                  </td>
                  <td>
                    {role.name !== "Super Admin" && (
                      <button
                        className="text-button"
                        onClick={() => setEditing(role)}
                      >
                        Edit permissions
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {roles.error && (
          <div className="notice">{errorMessage(roles.error)}</div>
        )}
      </section>
      {editing && (
        <RoleForm
          role={editing}
          permissions={permissions.data?.data || []}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries();
          }}
        />
      )}
    </>
  );
}
function RoleForm({ role, permissions, onClose, onSaved }) {
  const [name, setName] = useState(role.name),
    [selected, setSelected] = useState(role.permissions),
    [scope, setScope] = useState(role.scope || "Company");
  const mutation = useMutation({
    mutationFn: () =>
      role._id
        ? api.patch(`/roles/${role._id}`, { permissions: selected, scope })
        : api.post("/roles", { name, permissions: selected, scope }),
    onSuccess: onSaved,
  });
  return (
    <Dialog
      title={role._id ? `Access · ${role.name}` : "Create a role"}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <label>
          Role name
          <input
            required
            value={name}
            disabled={!!role._id}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="role-scope">
          Record access scope
          <select value={scope} onChange={(e) => setScope(e.target.value)}>
            {["Company", "Department", "Branch", "Direct reports", "Own"].map(
              (value) => (
                <option key={value}>{value}</option>
              ),
            )}
          </select>
        </label>
        <p>
          Scoped roles can grant employee, attendance, leave, task, work-report
          and performance permissions. Administration, payroll and private
          documents require company scope.
        </p>
        <div className="permission-grid">
          {permissions.map((permission) => (
            <label key={permission}>
              <input
                type="checkbox"
                checked={selected.includes(permission)}
                onChange={(e) =>
                  setSelected(
                    e.target.checked
                      ? [...selected, permission]
                      : selected.filter((p) => p !== permission),
                  )
                }
              />
              <span>
                {permission.replaceAll(".", " · ").replaceAll("-", " ")}
              </span>
            </label>
          ))}
        </div>
        {mutation.isError && (
          <div className="notice" role="alert">
            {errorMessage(mutation.error)}
          </div>
        )}
        <div className="form-footer">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={mutation.isPending}>
            Save permissions
          </button>
        </div>
      </form>
    </Dialog>
  );
}
function Users({ user }) {
  const roles = useQuery({ queryKey: ["roles"], queryFn: () => get("/roles") });
  const config = {
    title: "User access",
    description:
      "Roles control access. Changes end the user’s existing sessions.",
    endpoint: "/users",
    columns: [
      { label: "User", key: "name" },
      { label: "Email", key: "email" },
      { label: "Role", render: (r) => r.role?.name },
      { label: "Account", render: (r) => (r.active ? "Active" : "Inactive") },
    ],
    actions: [
      {
        label: "Assign role",
        endpoint: "role",
        when: (r) => r._id !== user.id && r.role?.name !== "Super Admin",
        fields: [
          {
            name: "role",
            label: "Role",
            type: "select",
            options: (roles.data?.data || [])
              .filter((r) => r.name !== "Super Admin")
              .map((r) => ({ value: r._id, label: r.name })),
          },
        ],
      },
    ],
  };
  return (
    <>
      <Reauthenticate />
      <ResourcePage config={config} user={user} />
    </>
  );
}
export function SettingsWorkspace({ user, children }) {
  const [tab, setTab] = useState("account");
  return (
    <>
      <div className="module-tabs">
        <button
          className={tab === "account" ? "active" : ""}
          onClick={() => setTab("account")}
        >
          My account
        </button>
        {can(user, "settings.manage") && (
          <button
            className={tab === "company" ? "active" : ""}
            onClick={() => setTab("company")}
          >
            Company & policies
          </button>
        )}
        {can(user, "roles.manage") && (
          <>
            <button
              className={tab === "roles" ? "active" : ""}
              onClick={() => setTab("roles")}
            >
              Roles & permissions
            </button>
            <button
              className={tab === "users" ? "active" : ""}
              onClick={() => setTab("users")}
            >
              User access
            </button>
          </>
        )}
      </div>
      {tab === "account" ? (
        <>
          {children}
          <MFA />
          <NotificationPreferences />
        </>
      ) : tab === "company" ? (
        <Company />
      ) : tab === "roles" ? (
        <Access />
      ) : (
        <Users user={user} />
      )}
    </>
  );
}
export function Reports({ user }) {
  const [tab, setTab] = useState("employees"),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [department, setDepartment] = useState(""),
    [branch, setBranch] = useState(""),
    [downloadError, setDownloadError] = useState(null);
  const types = [
    ["projects", "Projects", "projects.manage"],
    ["timesheets", "Timesheets", "timesheets.approve"],
    ["training", "Training", "training.manage"],
    ["expenses", "Expenses", "expenses.approve"],
    ["travel", "Travel", "travel.approve"],
    ["skills", "Skills", "training.manage"],
    ["leave-balances", "Leave balances", "leave.read"],
    ["employees", "Employees", "employee.read"],
    ["attendance", "Attendance", "attendance.read"],
    ["leaves", "Leave", "leave.read"],
    ["tasks", "Tasks", "tasks.manage"],
    ["daily-reports", "Work reports", "reports.review"],
    ["recruitment", "Recruitment", "recruitment.manage"],
    ["onboarding", "Onboarding", "onboarding.manage"],
    ["performance", "Performance", "performance.manage"],
    ["assets", "Assets", "assets.manage"],
    ["exits", "Exits", "exit.manage"],
    ["attrition", "Employee attrition", "exit.manage"],
    ["payroll", "Payroll", "payroll.view"],
  ].filter(([, , permission]) => can(user, permission));
  const type = types.find((t) => t[0] === tab)?.[0] || types[0]?.[0];
  if (!can(user, "reports.export"))
    return <p>You do not have report access.</p>;
  const endpoint = `/reports/${type}?from=${from}&to=${to}&department=${encodeURIComponent(department)}&branch=${encodeURIComponent(branch)}`;
  const base = {
    title: "Reports & analytics",
    description: "Authorized workforce records, ready for review and export.",
    endpoint,
    columns:
      type === "employees"
        ? [
            { label: "Code", key: "code" },
            { label: "First name", key: "firstName" },
            { label: "Last name", key: "lastName" },
            { label: "Department", key: "department" },
            { label: "Status", key: "status" },
          ]
        : type === "payroll"
          ? [
              { label: "Employee", render: (r) => r.employeeSnapshot.name },
              { label: "Period", render: (r) => r.period?.month },
              { label: "Gross (paise)", key: "gross" },
              { label: "Net (paise)", key: "net" },
            ]
          : [
              {
                label: "Record",
                render: (r) =>
                  r.title || r.name || r.employee?.firstName || r._id,
              },
              { label: "Status", render: (r) => r.status || "—" },
              {
                label: "Created",
                render: (r) =>
                  new Date(r.createdAt).toLocaleDateString("en-IN"),
              },
            ],
  };
  return (
    <>
      <div className="report-toolbar">
        <label>
          Report
          <select value={type || ""} onChange={(e) => setTab(e.target.value)}>
            {types.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <label>
          Department
          <input
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="All departments"
          />
        </label>
        <label>
          Branch
          <input
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            placeholder="All branches"
          />
        </label>
        {["csv", "xlsx", "pdf"].map((format) => (
          <button
            key={format}
            className="secondary"
            onClick={() => {
              setDownloadError(null);
              download(
                endpoint + "&format=" + format,
                `ABCO-${type}.${format}`,
              ).catch(setDownloadError);
            }}
          >
            Export {format.toUpperCase()}
          </button>
        ))}
      </div>
      {downloadError && (
        <div className="notice">{errorMessage(downloadError)}</div>
      )}
      <ResourcePage config={base} user={user} />
    </>
  );
}
export function AuditLogs({ user }) {
  return (
    <ResourcePage
      user={user}
      config={{
        title: "Audit history",
        description: "A traceable history of privileged activity.",
        endpoint: "/audit-logs",
        columns: [
          { label: "Action", key: "action" },
          { label: "Actor", render: (r) => r.actor?.name || "System" },
          { label: "Resource", key: "resource" },
          {
            label: "When",
            render: (r) => new Date(r.createdAt).toLocaleString("en-IN"),
          },
        ],
      }}
    />
  );
}
