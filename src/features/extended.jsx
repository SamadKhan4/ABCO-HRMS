import React from "react";
import ResourcePage, {
  employeeField,
  person,
  can,
  currency,
} from "../components/ResourcePage";
const f = (name, label, type = "text", extra = {}) => ({
  name,
  label,
  type,
  ...extra,
});
const select = (name, label, options, extra = {}) =>
  f(name, label, "select", { options, ...extra });
const status = { label: "Status", key: "status", status: true },
  employee = { label: "Employee", render: (record) => person(record.employee) };
const today = () => new Date().toISOString().slice(0, 10);
const own = (record, user) =>
  String(record.employee?._id || record.employee) === String(user.employee);
const clean = (input) =>
  Object.fromEntries(
    Object.entries(input).filter(([, v]) => v !== "" && v != null),
  );
const reviewFields = [
  select("status", "Decision", ["Approved", "Rejected"]),
  f("note", "Review note", "textarea"),
];
function surveyAnswers(input, record) {
  return {
    answers: record.questions.map((question, index) => {
      const answer = { question: index };
      if (question.type === "Rating") answer.rating = input.responses[index];
      else answer.text = input.responses[index];
      return answer;
    }),
  };
}
export function extendedConfigs(user) {
  return {
    projects: {
      title: "Projects",
      description: "Connect teams, delivery and time with clear ownership.",
      endpoint: "/projects",
      create: "Create project",
      permission: "projects.manage",
      fields: [
        f("name", "Project name"),
        f("code", "Project code"),
        f("department", "Department"),
        f("description", "Description", "textarea", { full: true }),
        f("startDate", "Start date", "date"),
        f("endDate", "End date", "date"),
        f("employees", "Assigned employees", "array", {
          itemLabel: "employee",
          fields: [employeeField],
        }),
      ],
      initial: { employees: [{ employee: "" }] },
      prepare: (input) => ({
        ...input,
        employees: input.employees.map((item) => item.employee),
      }),
      columns: [
        { label: "Project", key: "name" },
        { label: "Code", key: "code" },
        { label: "Department", key: "department" },
        { label: "End date", key: "endDate" },
        status,
      ],
      actions: [
        {
          label: "Update status",
          endpoint: "status",
          permission: "projects.manage",
          when: (r) => r.status !== "Archived",
          fields: (r) => [
            select(
              "status",
              "Next status",
              {
                Planned: ["Active", "Archived"],
                Active: ["On Hold", "Completed"],
                "On Hold": ["Active", "Archived"],
                Completed: ["Archived"],
              }[r.status] || [],
            ),
          ],
        },
      ],
    },
    timesheets: {
      title: "Timesheets",
      description: "A clear record of billable and non-billable project work.",
      endpoint: "/timesheets",
      needsProjects: true,
      create: "Add time entry",
      fields: [
        f("project", "Project", "select", { source: "projects" }),
        f("date", "Work date", "date"),
        f("minutes", "Minutes", "number", { min: 1, max: 1440 }),
        f("billable", "Billable time", "checkbox"),
        f("description", "Work description", "textarea", { full: true }),
      ],
      initial: { date: today(), minutes: 60, billable: false },
      columns: [
        employee,
        { label: "Project", render: (r) => r.project?.name },
        { label: "Date", key: "date" },
        { label: "Time", render: (r) => `${r.minutes} min` },
        {
          label: "Type",
          render: (r) => (r.billable ? "Billable" : "Non-billable"),
        },
        status,
      ],
      actions: [
        {
          label: "Submit timesheet",
          endpoint: "submit",
          when: (r, u) => r.status === "Draft" && own(r, u),
          fields: [],
        },
        {
          label: "Review timesheet",
          endpoint: "review",
          permission: "timesheets.approve",
          when: (r, u) => r.status === "Submitted" && !own(r, u),
          fields: reviewFields,
        },
      ],
    },
    training: {
      title: "Training & development",
      description: "Build skills and open new possibilities for your team.",
      endpoint: "/training",
      create: "Create training program",
      permission: "training.manage",
      fields: [
        f("title", "Training title"),
        f("course", "Course"),
        f("trainer", "Trainer"),
        f("description", "Description", "textarea", { full: true }),
        f("startDate", "Start date", "date"),
        f("endDate", "End date", "date"),
        f("skills", "Skills covered", "array", {
          itemLabel: "skill",
          fields: [f("name", "Skill")],
        }),
      ],
      initial: { skills: [{ name: "" }] },
      prepare: (input) => ({
        ...input,
        skills: input.skills.map((skill) => skill.name),
      }),
      columns: [
        { label: "Training", key: "title" },
        { label: "Course", key: "course" },
        { label: "Trainer", key: "trainer" },
        { label: "Dates", render: (r) => `${r.startDate} – ${r.endDate}` },
        status,
      ],
      actions: [
        {
          label: "Assign employee",
          endpoint: "assign",
          permission: "training.manage",
          when: (r) => ["Planned", "Active"].includes(r.status),
          fields: [employeeField],
        },
        {
          label: "Update status",
          endpoint: "status",
          permission: "training.manage",
          when: (r) => !["Completed", "Cancelled"].includes(r.status),
          fields: [
            select("status", "Status", ["Active", "Completed", "Cancelled"]),
          ],
        },
      ],
    },
    "training-enrollments": {
      title: "Learning progress",
      description:
        "Track assigned courses, attendance, assessments and completion.",
      endpoint: "/training-enrollments",
      columns: [
        employee,
        { label: "Training", render: (r) => r.training?.title },
        { label: "Progress", render: (r) => `${r.progress}%` },
        {
          label: "Assessment",
          render: (r) =>
            r.assessmentScore == null ? "—" : `${r.assessmentScore}/100`,
        },
        status,
      ],
      actions: [
        {
          label: "Update progress",
          endpoint: "progress",
          when: (r, u) => r.status !== "Completed" && own(r, u),
          fields: [
            f("progress", "Progress (%)", "number", { min: 0, max: 99 }),
            f("feedback", "Learning feedback", "textarea", { required: false }),
          ],
        },
        {
          label: "Mark attendance",
          endpoint: "attendance",
          when: (r, u) => r.status !== "Completed" && own(r, u),
          fields: [],
        },
        {
          label: "Record assessment",
          endpoint: "complete",
          permission: "training.manage",
          when: (r, u) => r.status !== "Completed" && !own(r, u),
          fields: [
            f("assessmentScore", "Assessment result (0–100)", "number", {
              min: 0,
              max: 100,
            }),
          ],
        },
      ],
    },
    skills: {
      title: "Skills & capability",
      description: "Understand current strengths and identify where to grow.",
      endpoint: "/skills",
      create: "Record skill assessment",
      permission: "training.manage",
      fields: [
        employeeField,
        f("name", "Skill"),
        f("level", "Current level (0–5)", "number", { min: 0, max: 5 }),
        f("targetLevel", "Target level (0–5)", "number", { min: 0, max: 5 }),
      ],
      columns: [
        employee,
        { label: "Skill", key: "name" },
        { label: "Current level", key: "level" },
        { label: "Target level", key: "targetLevel" },
        { label: "Gap", render: (r) => Math.max(0, r.targetLevel - r.level) },
      ],
    },
    "expense-policies": {
      title: "Expense policies",
      description:
        "Approved reimbursement limits, explicitly configured by finance.",
      endpoint: "/expense-policies",
      create: "Create expense policy",
      permission: "expenses.manage",
      note: "No reimbursement limits are assumed. Finance must configure approved categories and limits before claims can be submitted.",
      fields: [
        f("name", "Category / policy name"),
        f("maximumAmount", "Maximum claim amount (INR)"),
        f("receiptRequired", "Receipt required", "checkbox"),
        f("effectiveFrom", "Effective from", "date"),
      ],
      columns: [
        { label: "Policy", key: "name" },
        { label: "Maximum claim", render: (r) => currency(r.maximumAmount) },
        {
          label: "Receipt",
          render: (r) => (r.receiptRequired ? "Required" : "Optional"),
        },
        { label: "Effective from", key: "effectiveFrom" },
        { label: "Status", render: (r) => (r.active ? "Active" : "Inactive") },
      ],
      actions: [
        {
          label: "Deactivate policy",
          endpoint: "deactivate",
          permission: "expenses.manage",
          when: (r) => r.active,
          fields: [],
        },
      ],
    },
    expenses: {
      title: "Expenses & reimbursements",
      description: "Submit clear claims and follow every step through payment.",
      endpoint: "/expenses",
      needsPolicies: true,
      needsDocuments: true,
      needsTravel: true,
      create: "Create expense claim",
      fields: [
        f("policy", "Expense policy", "select", { source: "policies" }),
        f("title", "Claim title"),
        f("date", "Expense date", "date"),
        f("amount", "Amount (INR)"),
        f("description", "Description", "textarea", { full: true }),
        f("receipt", "Receipt document", "select", {
          source: "documents",
          required: false,
          help: "Upload the receipt in Documents first.",
        }),
        f("travel", "Related trip", "select", {
          source: "travel",
          required: false,
        }),
      ],
      initial: { date: today() },
      prepare: clean,
      columns: [
        employee,
        { label: "Claim", key: "title" },
        { label: "Category", render: (r) => r.policySnapshot.name },
        { label: "Amount", render: (r) => currency(r.amount) },
        status,
      ],
      actions: [
        {
          label: "Submit claim",
          endpoint: "submit",
          when: (r, u) => r.status === "Draft" && own(r, u),
          fields: [],
        },
        {
          label: "Review claim",
          endpoint: "review",
          permission: "expenses.approve",
          when: (r, u) => r.status === "Submitted" && !own(r, u),
          fields: reviewFields,
        },
        {
          label: "Record payment",
          endpoint: "pay",
          permission: "expenses.pay",
          when: (r) => r.status === "Approved",
          fields: [f("paymentReference", "Payment reference")],
        },
      ],
    },
    travel: {
      title: "Travel & visits",
      description:
        "Plan approved trips and keep expenses and advances connected.",
      endpoint: "/travel",
      create: "Request travel",
      fields: [
        f("destination", "Destination"),
        f("purpose", "Business purpose", "textarea", { full: true }),
        f("startDate", "Start date", "date"),
        f("endDate", "End date", "date"),
        f("itinerary", "Travel plan", "textarea", { full: true }),
        f("advanceRequested", "Requested advance (INR)"),
      ],
      initial: { advanceRequested: "0" },
      columns: [
        employee,
        { label: "Destination", key: "destination" },
        { label: "Dates", render: (r) => `${r.startDate} – ${r.endDate}` },
        { label: "Advance", render: (r) => currency(r.advancePaid) },
        status,
      ],
      actions: [
        {
          label: "Review travel",
          endpoint: "review",
          permission: "travel.approve",
          when: (r, u) => r.status === "Requested" && !own(r, u),
          fields: reviewFields,
        },
        {
          label: "Record advance",
          endpoint: "advance",
          permission: "expenses.pay",
          when: (r) => r.status === "Approved" && !r.advanceReference,
          fields: [
            f("amount", "Advance amount (INR)"),
            f("paymentReference", "Payment reference"),
          ],
        },
        {
          label: "Start travel",
          endpoint: "start",
          when: (r, u) => r.status === "Approved" && own(r, u),
          fields: [],
        },
        {
          label: "Submit settlement",
          endpoint: "submit-settlement",
          when: (r, u) =>
            ["Approved", "In Progress"].includes(r.status) && own(r, u),
          fields: [],
        },
        {
          label: "Record settlement",
          endpoint: "settle",
          permission: "expenses.pay",
          when: (r) => r.status === "Settlement Submitted",
          fields: [
            f("paymentReference", "Settlement / reconciliation reference"),
          ],
        },
        {
          label: "Cancel trip",
          endpoint: "cancel",
          when: (r, u) =>
            ["Requested", "Approved"].includes(r.status) &&
            !r.advancePaid &&
            own(r, u),
          fields: [],
        },
      ],
    },
    surveys: {
      title: "Employee surveys",
      description:
        "Listen carefully. Learn together. Build a better workplace.",
      endpoint: "/surveys",
      create: "Create survey",
      permission: "engagement.manage",
      fields: [
        f("title", "Survey title"),
        f("description", "Introduction", "textarea", { full: true }),
        f("department", "Department (blank for all)", "text", {
          required: false,
        }),
        f("anonymous", "Anonymous responses", "checkbox"),
        f("opensAt", "Opens at", "datetime-local"),
        f("closesAt", "Closes at", "datetime-local"),
        f("questions", "Questions", "array", {
          itemLabel: "question",
          fields: [
            f("title", "Question"),
            select("type", "Response type", ["Rating", "Text"]),
          ],
        }),
      ],
      initial: { anonymous: true, questions: [{ title: "", type: "Rating" }] },
      prepare: (input) => ({
        ...input,
        opensAt: new Date(input.opensAt).toISOString(),
        closesAt: new Date(input.closesAt).toISOString(),
      }),
      columns: [
        { label: "Survey", key: "title" },
        { label: "Department", render: (r) => r.department || "Everyone" },
        {
          label: "Privacy",
          render: (r) => (r.anonymous ? "Anonymous" : "Identified"),
        },
        status,
      ],
      actions: [
        {
          label: "Publish survey",
          endpoint: "status",
          permission: "engagement.manage",
          when: (r) => r.status === "Draft",
          fields: [],
          prepare: () => ({ status: "Published" }),
        },
        {
          label: "Close survey",
          endpoint: "status",
          permission: "engagement.manage",
          when: (r) => r.status === "Published",
          fields: [],
          prepare: () => ({ status: "Closed" }),
        },
        {
          label: "Respond",
          endpoint: "respond",
          when: (r) => r.status === "Published",
          fields: (r) =>
            r.questions.map((question, index) =>
              f(
                `responses.${index}`,
                question.title,
                question.type === "Rating" ? "number" : "textarea",
                question.type === "Rating" ? { min: 1, max: 5 } : {},
              ),
            ),
          prepare: surveyAnswers,
        },
      ],
    },
    recognitions: {
      title: "Recognition & rewards",
      description: "Celebrate the people who make good work happen.",
      endpoint: "/recognitions",
      create: "Recognize a colleague",
      permission: "engagement.manage",
      fields: [
        employeeField,
        f("title", "Recognition title"),
        f("message", "What made a difference?", "textarea", { full: true }),
        f("reward", "Reward / acknowledgement", "text", { required: false }),
      ],
      columns: [
        employee,
        { label: "Recognition", key: "title" },
        { label: "Message", key: "message", wrap: true },
        { label: "Reward", key: "reward" },
      ],
    },
    suggestions: {
      title: "Ideas & suggestions",
      description: "A place for every voice and every thoughtful improvement.",
      endpoint: "/suggestions",
      create: "Share a suggestion",
      fields: [
        f("title", "Idea title"),
        f("category", "Category"),
        f("body", "Your suggestion", "textarea", { full: true }),
      ],
      columns: [
        employee,
        { label: "Suggestion", key: "title" },
        { label: "Category", key: "category" },
        status,
      ],
      actions: [
        {
          label: "Review suggestion",
          endpoint: "review",
          permission: "engagement.manage",
          when: (r, u) =>
            !["Accepted", "Declined"].includes(r.status) && !own(r, u),
          fields: [
            select("status", "Decision", ["Reviewed", "Accepted", "Declined"]),
            f("note", "Review note", "textarea"),
          ],
        },
      ],
    },
    "approval-workflows": {
      title: "Approval workflows",
      description:
        "Explicit approval steps, preserved for each submitted request.",
      endpoint: "/approval-workflows",
      create: "Configure workflow",
      permission: "approvals.manage",
      needsApprovalRoles: true,
      note: "Confirm your password in Settings before changing approval workflows. Existing requests preserve their configured steps.",
      fields: [
        f("name", "Workflow name"),
        select("module", "Module", ["Leave", "Expense", "Travel", "Timesheet"]),
        f("steps", "Approval steps", "array", {
          itemLabel: "step",
          fields: [
            select("type", "Approver type", ["Role", "Reporting Manager"]),
            f("role", "Approver role", "select", {
              source: "approvalRoles",
              required: false,
            }),
            f("escalationHours", "Escalation threshold (hours)", "number", {
              min: 1,
              max: 720,
            }),
          ],
        }),
      ],
      initial: { steps: [{ type: "Role", role: "", escalationHours: "" }] },
      prepare: (input) => ({ ...input, steps: input.steps.map(clean) }),
      columns: [
        { label: "Workflow", key: "name" },
        { label: "Module", key: "module" },
        { label: "Steps", render: (r) => r.steps.length },
        {
          label: "Status",
          render: (r) => (r.active ? "Active" : "Superseded"),
        },
      ],
    },
    approvals: {
      title: "Approval inbox",
      description: "See each request’s current step and its decision history.",
      endpoint: "/approvals",
      columns: [
        employee,
        { label: "Request", key: "title" },
        { label: "Module", key: "module" },
        {
          label: "Step",
          render: (r) => `${r.currentStep + 1} / ${r.steps.length}`,
        },
        status,
      ],
      actions: [
        {
          label: "Open request module",
          run: (r) =>
            window.location.assign(
              {
                Leave: "/leaves",
                Expense: "/expenses",
                Travel: "/travel",
                Timesheet: "/timesheets",
              }[r.module] || "/",
            ),
        },
      ],
    },
    "approval-delegations": {
      title: "Approval delegation",
      description: "Time-limited delegation to another authorized approver.",
      endpoint: "/approval-delegations",
      create: "Delegate approvals",
      needsApprovalUsers: true,
      fields: [
        select("module", "Module", ["Leave", "Expense", "Travel", "Timesheet"]),
        f("delegate", "Delegate to", "select", { source: "approvalUsers" }),
        f("startsAt", "Starts at", "datetime-local"),
        f("endsAt", "Ends at", "datetime-local"),
      ],
      prepare: (input) => ({
        ...input,
        startsAt: new Date(input.startsAt).toISOString(),
        endsAt: new Date(input.endsAt).toISOString(),
      }),
      columns: [
        { label: "Module", key: "module" },
        { label: "From", render: (r) => r.from?.name },
        { label: "Delegate", render: (r) => r.delegate?.name },
        {
          label: "Expires",
          render: (r) => new Date(r.endsAt).toLocaleString("en-IN"),
        },
        { label: "Status", render: (r) => (r.active ? "Active" : "Revoked") },
      ],
      actions: [
        {
          label: "Revoke",
          endpoint: "revoke",
          when: (r, u) => r.active && r.from?._id === u.id,
          fields: [],
        },
      ],
    },
  };
}
export default function ExtendedPage({ module, user }) {
  const config = extendedConfigs(user)[module];
  return config ? (
    <ResourcePage key={module} config={config} user={user} />
  ) : null;
}
