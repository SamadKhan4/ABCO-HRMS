import Attachments from "../components/Attachments";
import React from "react";
import { useMutation } from "@tanstack/react-query";
import ResourcePage, {
  can,
  person,
  currency,
  employeeField,
  download,
} from "../components/ResourcePage";
import { api, errorMessage } from "../api";

const f = (name, label, type = "text", extra = {}) => ({
  name,
  label,
  type,
  ...extra,
});
const select = (name, label, options, extra = {}) =>
  f(name, label, "select", { options, ...extra });
const status = { label: "Status", key: "status", status: true };
const employee = {
  label: "Employee",
  key: "employee",
  render: (record) => person(record.employee),
};
const own = (record, user) =>
  String(record.employee?._id || record.employee) === String(user.employee);
const clean = (input) =>
  Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== "" && value != null),
  );
const today = () => new Date().toISOString().slice(0, 10);
const note = f("note", "Note", "textarea");
function Checklist({ record, refresh, user, lookups }) {
  const mutation = useMutation({
    mutationFn: (item) =>
      api.post(`/onboarding/${record._id}/items/${item._id}/complete`),
    onSuccess: refresh,
  });
  return (
    <section className="checklist-actions">
      <h3>Checklist progress</h3>
      {record.checklist.map((item) => (
        <div className="checklist-item" key={item._id}>
          <div>
            <strong>{item.title}</strong>
            <small>
              {lookups.employees.find((e) => e.value === String(item.owner))
                ?.label || "Assigned owner"}{" "}
              · Due {item.deadline}
            </small>
          </div>
          {item.done ? (
            <span className="badge">Complete</span>
          ) : (
            (can(user, "onboarding.manage") ||
              String(item.owner) === String(user.employee)) && (
              <button
                className="secondary"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate(item)}
              >
                Mark complete
              </button>
            )
          )}
        </div>
      ))}
      {mutation.isError && (
        <div className="notice" role="alert">
          {errorMessage(mutation.error)}
        </div>
      )}
    </section>
  );
}
export function resourceConfigs(user) {
  return {
    tasks: {
      title: "Tasks & work",
      description:
        "Clear ownership. Meaningful progress. A team moving together.",
      endpoint: "/tasks",
      detailContent: (record) => (
        <Attachments context="tasks" record={record} />
      ),
      needsProjects: true,
      edit: {
        permission: "tasks.manage",
        when: (r) => !["Completed", "Cancelled"].includes(r.status),
        initial: (r) => ({ ...r, employee: r.employee?._id || r.employee }),
      },
      prepare: clean,
      create: "Assign task",
      permission: "tasks.manage",
      fields: [
        f("title", "Task title"),
        f("project", "Project", "select", {
          source: "projects",
          required: false,
        }),
        f("description", "Description", "textarea", { full: true }),
        employeeField,
        select("priority", "Priority", ["Low", "Normal", "High", "Urgent"]),
        f("startDate", "Start date", "date"),
        f("dueDate", "Due date", "date"),
        f("estimatedMinutes", "Estimated minutes", "number", { min: 0 }),
      ],
      initial: { priority: "Normal", startDate: today(), estimatedMinutes: 0 },
      columns: [
        { label: "Task", key: "title" },
        employee,
        { label: "Priority", key: "priority" },
        { label: "Due date", key: "dueDate" },
        status,
      ],
      actions: [
        {
          label: "Archive",
          endpoint: "archive",
          permission: "tasks.manage",
          when: (r) =>
            ["Completed", "Cancelled"].includes(r.status) && !r.archived,
          fields: [],
        },
        {
          label: "Update status",
          endpoint: "status",
          fields: (record) => [
            select(
              "status",
              "Status",
              (
                {
                  "To Do": ["In Progress", "Cancelled"],
                  "In Progress": ["On Hold", "Completed", "Cancelled"],
                  "On Hold": ["In Progress", "Cancelled"],
                }[record.status] || []
              ).filter((s) => s !== "Cancelled" || can(user, "tasks.manage")),
            ),
            f("actualMinutes", "Actual minutes", "number", { min: 0 }),
          ],
          when: (record) => !["Completed", "Cancelled"].includes(record.status),
          initial: { actualMinutes: 0 },
        },
        {
          label: "Comment",
          endpoint: "comments",
          fields: [f("body", "Comment", "textarea")],
        },
      ],
    },
    "daily-reports": {
      title: "Daily work reports",
      description:
        "Capture your progress, share blockers, and keep the team aligned.",
      endpoint: "/daily-reports",
      needsProjects: true,
      edit: {
        when: (r, u) => ["Draft", "Rejected"].includes(r.status) && own(r, u),
      },
      prepare: clean,
      create: "Write report",
      fields: [
        f("date", "Report date", "date"),
        f("title", "Work summary"),
        select("workStatus", "Work status", [
          "In Progress",
          "Completed",
          "Blocked",
        ]),
        f("project", "Project", "select", {
          source: "projects",
          required: false,
        }),
        f("description", "What did you accomplish?", "textarea", {
          full: true,
        }),
        f("minutes", "Time spent (minutes)", "number", { min: 0, max: 1440 }),
        f("blockers", "Blockers", "textarea", { required: false }),
        f("notes", "Additional notes", "textarea", { required: false }),
      ],
      initial: { date: today(), minutes: 0, workStatus: "In Progress" },
      columns: [
        employee,
        { label: "Report", key: "title" },
        { label: "Date", key: "date" },
        { label: "Minutes", key: "minutes" },
        status,
      ],
      actions: [
        {
          label: "Submit report",
          endpoint: "submit",
          when: (r, u) => r.status === "Draft" && own(r, u),
          fields: [],
        },
        {
          label: "Review",
          endpoint: "review",
          permission: "reports.review",
          when: (r, u) => r.status === "Submitted" && !own(r, u),
          fields: [
            select("status", "Decision", ["Reviewed", "Approved", "Rejected"]),
            f("comment", "Review comments", "textarea"),
          ],
        },
      ],
    },
    announcements: {
      title: "Company announcements",
      description:
        "Keep everyone informed, connected, and moving in the same direction.",
      endpoint: "/announcements",
      edit: {
        permission: "announcements.manage",
        when: (r) => !r.archived,
        initial: (r) => ({
          ...r,
          publishAt: new Date(r.publishAt).toISOString().slice(0, 16),
          expiresAt: r.expiresAt
            ? new Date(r.expiresAt).toISOString().slice(0, 16)
            : "",
        }),
      },
      create: "Create announcement",
      permission: "announcements.manage",
      fields: [
        f("title", "Title"),
        f("body", "Message", "textarea", { full: true }),
        f("department", "Department (blank for all)", "text", {
          required: false,
        }),
        f("branch", "Branch (blank for all)", "text", { required: false }),
        f("important", "Important", "checkbox"),
        f("publishAt", "Publish at", "datetime-local"),
        f("expiresAt", "Expires at", "datetime-local", { required: false }),
      ],
      initial: { publishAt: new Date().toISOString().slice(0, 16) },
      prepare: (input) => ({
        ...input,
        publishAt: new Date(input.publishAt).toISOString(),
        expiresAt: input.expiresAt
          ? new Date(input.expiresAt).toISOString()
          : null,
      }),
      columns: [
        { label: "Announcement", key: "title" },
        { label: "Department", render: (r) => r.department || "Everyone" },
        {
          label: "Published",
          render: (r) => new Date(r.publishAt).toLocaleString("en-IN"),
        },
        {
          label: "Important",
          render: (r) => (r.important ? "Important" : "Standard"),
        },
      ],
      actions: [
        {
          label: "Acknowledge",
          endpoint: "acknowledge",
          when: (r, u) =>
            !r.archived && !r.acknowledgedBy?.includes(u.employee),
          fields: [],
        },
        {
          label: "Archive announcement",
          endpoint: "archive",
          permission: "announcements.manage",
          when: (r) => !r.archived,
          fields: [],
        },
      ],
    },
    helpdesk: {
      title: "Helpdesk",
      description: "A helping hand for every question about your workday.",
      endpoint: "/helpdesk",
      detailContent: (record) => (
        <Attachments context="helpdesk" record={record} />
      ),
      create: "Raise a request",
      fields: [
        f("subject", "Subject"),
        select("category", "Category", [
          "Payroll",
          "Attendance",
          "Leave",
          "Documents",
          "HR Policy",
          "IT Support",
          "Other",
        ]),
        select("priority", "Priority", ["Low", "Normal", "High", "Urgent"]),
        f("description", "How can we help?", "textarea", { full: true }),
      ],
      initial: { priority: "Normal", category: "Other" },
      columns: [
        { label: "Ticket", key: "number" },
        { label: "Subject", key: "subject" },
        employee,
        { label: "Priority", key: "priority" },
        status,
      ],
      actions: [
        {
          label: "Escalate",
          endpoint: "escalate",
          when: (r) => !["Resolved", "Closed"].includes(r.status),
          fields: [f("reason", "Escalation reason", "textarea")],
        },
        {
          label: "Reply",
          endpoint: "reply",
          when: (r) => r.status !== "Closed",
          fields: [f("body", "Message", "textarea")],
        },
        {
          label: "Update status",
          endpoint: "status",
          permission: "helpdesk.manage",
          when: (r) => r.status !== "Closed",
          fields: (r) => [
            select(
              "status",
              "Status",
              {
                Open: ["In Progress", "Closed"],
                "In Progress": ["Awaiting Response", "Resolved"],
                "Awaiting Response": ["In Progress", "Resolved"],
                Resolved: ["In Progress", "Closed"],
              }[r.status] || [],
            ),
          ],
        },
      ],
    },
    holidays: {
      title: "Holiday calendar",
      description: "Good days to pause, celebrate, and reconnect.",
      endpoint: "/holidays",
      edit: {
        permission: "organization.manage",
        when: (r) => r.active !== false,
      },
      actions: [
        {
          label: "Remove from calendar",
          endpoint: "deactivate",
          permission: "organization.manage",
          when: (r) => r.active !== false,
          fields: [],
        },
      ],
      create: "Add holiday",
      permission: "organization.manage",
      fields: [
        f("name", "Holiday name"),
        select("category", "Holiday category", [
          "National",
          "Company",
          "Optional",
        ]),
        f("date", "Date", "date"),
        f("branch", "Branch (blank for all)", "text", { required: false }),
        f("optional", "Optional holiday", "checkbox"),
      ],
      columns: [
        { label: "Holiday", key: "name" },
        { label: "Date", key: "date" },
        { label: "Branch", render: (r) => r.branch || "All branches" },
        {
          label: "Type",
          render: (r) => (r.optional ? "Optional" : "Company holiday"),
        },
      ],
    },
    jobs: {
      title: "Job openings",
      description: "Find the people who will shape what comes next.",
      endpoint: "/recruitment/jobs",
      create: "Open a position",
      permission: "recruitment.manage",
      fields: [
        f("title", "Job title"),
        f("department", "Department"),
        f("location", "Location"),
        select("employmentType", "Employment type", [
          "Full time",
          "Part time",
          "Contract",
          "Internship",
        ]),
        f("vacancies", "Vacancies", "number", { min: 1, max: 1000 }),
        f("openingDate", "Opening date", "date"),
        f("description", "Job description", "textarea", { full: true }),
        f("requirements", "Requirements", "textarea", { full: true }),
      ],
      initial: {
        employmentType: "Full time",
        vacancies: 1,
        openingDate: today(),
      },
      columns: [
        { label: "Position", key: "title" },
        { label: "Department", key: "department" },
        { label: "Vacancies", key: "vacancies" },
        { label: "Location", key: "location" },
        status,
      ],
      actions: [
        {
          label: "Update status",
          endpoint: "status",
          permission: "recruitment.manage",
          fields: [select("status", "Status", ["Open", "On Hold", "Closed"])],
        },
      ],
    },
    candidates: {
      title: "Candidate pipeline",
      description: "From first conversation to a warm welcome.",
      endpoint: "/recruitment/candidates",
      needsTemplates: true,
      needsJobs: true,
      create: "Add candidate",
      permission: "recruitment.manage",
      fields: [
        f("name", "Full name"),
        f("email", "Email", "email"),
        f("phone", "Phone"),
        f("job", "Position", "select", { source: "jobs" }),
        f("source", "Source"),
        f("experience", "Experience"),
        f("skills", "Skills"),
        f("notes", "Recruiter notes", "textarea", {
          required: false,
          full: true,
        }),
      ],
      columns: [
        { label: "Candidate", key: "name" },
        { label: "Email", key: "email" },
        { label: "Position", render: (r) => r.job?.title || "—" },
        status,
      ],
      actions: [
        {
          label: "Upload resume",
          endpoint: "resume",
          multipart: true,
          permission: "recruitment.manage",
          fields: [
            f("file", "Resume (PDF, PNG or JPEG)", "file", {
              accept: ".pdf,.png,.jpg,.jpeg",
            }),
          ],
        },
        {
          label: "Download resume",
          permission: "recruitment.manage",
          when: (r) => Boolean(r.resume),
          run: async (record) => {
            const access = (
              await api.post(
                `/recruitment/candidates/${record._id}/resume/access`,
                {},
              )
            ).data.data;
            await download(
              access.url.replace("/api/v1", ""),
              "Resume-" + record.name + ".pdf",
            );
          },
        },
        {
          label: "Generate offer",
          permission: "documents.manage",
          when: (r) => ["Selected", "Offered", "Accepted"].includes(r.status),
          endpoint: () => "/generated-letters",
          fields: [
            f("template", "Offer template", "select", { source: "templates" }),
          ],
          prepare: (input, record) => ({
            template: input.template,
            candidate: record._id,
          }),
        },
        {
          label: "Move stage",
          endpoint: "stage",
          permission: "recruitment.manage",
          when: (r) =>
            !["Joined", "Rejected", "Withdrawn", "Accepted"].includes(r.status),
          fields: (r) => [
            select(
              "status",
              "Next stage",
              {
                Applied: ["Screening", "Rejected", "Withdrawn"],
                Screening: ["Interview", "Rejected", "Withdrawn"],
                Interview: ["Evaluation", "Rejected", "Withdrawn"],
                Evaluation: ["Selected", "Rejected", "Withdrawn"],
                Selected: ["Offered", "Rejected", "Withdrawn"],
                Offered: ["Accepted", "Rejected", "Withdrawn"],
              }[r.status] || [],
            ),
            f("interviewAt", "Interview time", "datetime-local", {
              required: false,
            }),
            f("feedback", "Feedback", "textarea", { required: false }),
          ],
          prepare: (input) => ({
            ...clean(input),
            ...(input.interviewAt
              ? { interviewAt: new Date(input.interviewAt).toISOString() }
              : {}),
          }),
        },
        {
          label: "Convert to employee",
          endpoint: "join",
          permission: "employee.create",
          when: (r) => r.status === "Accepted",
          fields: [
            f("joiningDate", "Joining date", "date"),
            f("designation", "Designation"),
            f("branch", "Branch"),
          ],
        },
      ],
    },
    onboarding: {
      title: "Employee onboarding",
      description: "Make every new beginning feel like belonging.",
      endpoint: "/onboarding",
      create: "Start onboarding",
      permission: "onboarding.manage",
      fields: [
        employeeField,
        f("checklist", "Onboarding checklist", "array", {
          itemLabel: "checklist item",
          fields: [
            f("title", "Checklist item"),
            { ...employeeField, name: "owner", label: "Owner" },
            f("deadline", "Deadline", "date"),
          ],
        }),
      ],
      initial: { checklist: [{ title: "", owner: "", deadline: today() }] },
      columns: [
        employee,
        status,
        {
          label: "Progress",
          render: (r) =>
            `${r.checklist.filter((i) => i.done).length} / ${r.checklist.length} complete`,
        },
      ],
      actions: [
        {
          label: "Add checklist item",
          endpoint: "items",
          permission: "onboarding.manage",
          when: (r) => r.status === "In Progress",
          fields: [
            f("title", "Checklist item"),
            { ...employeeField, name: "owner", label: "Owner" },
            f("deadline", "Deadline", "date"),
          ],
        },
        {
          label: "Complete onboarding",
          endpoint: "approve",
          permission: "onboarding.manage",
          when: (r) =>
            r.status === "In Progress" &&
            r.checklist.length > 0 &&
            r.checklist.every((i) => i.done),
          fields: [],
        },
      ],
      detailContent: (record, props) => (
        <Checklist record={record} {...props} />
      ),
    },
    performance: {
      title: "Performance & growth",
      description: "Thoughtful goals. Honest feedback. Room to grow.",
      endpoint: "/performance",
      create: "Create review cycle",
      permission: "performance.manage",
      fields: [
        employeeField,
        f("title", "Review cycle"),
        f("startDate", "Start date", "date"),
        f("endDate", "End date", "date"),
        f("goals", "Goals (weights must total 100)", "array", {
          itemLabel: "goal",
          fields: [
            f("title", "Goal"),
            f("weight", "Weight (%)", "number", { min: 1, max: 100 }),
          ],
        }),
      ],
      initial: { goals: [{ title: "", weight: 100 }] },
      columns: [
        employee,
        { label: "Cycle", key: "title" },
        { label: "Period", render: (r) => `${r.startDate} – ${r.endDate}` },
        status,
        {
          label: "Weighted score",
          render: (r) => (r.weightedScore ? `${r.weightedScore} / 5` : "—"),
        },
      ],
      actions: [
        {
          label: "Self assessment",
          endpoint: "self-review",
          when: (r, u) => r.status === "Goals Assigned" && own(r, u),
          fields: (r) => [
            ...r.goals.map((g, i) =>
              f(`scores.${i}`, `${g.title} (1–5)`, "number", {
                min: 1,
                max: 5,
              }),
            ),
            f("comment", "Self-review", "textarea"),
          ],
        },
        {
          label: "Manager review",
          endpoint: "manager-review",
          permission: "performance.manage",
          when: (r, u) => r.status === "Self Review Submitted" && !own(r, u),
          fields: (r) => [
            ...r.goals.map((g, i) =>
              f(`scores.${i}`, `${g.title} (1–5)`, "number", {
                min: 1,
                max: 5,
              }),
            ),
            f("comment", "Manager feedback", "textarea"),
          ],
        },
        {
          label: "Approve review",
          endpoint: "approve",
          permission: "performance.approve",
          when: (r, u) => r.status === "Manager Reviewed" && !own(r, u),
          fields: [],
        },
        {
          label: "Acknowledge",
          endpoint: "acknowledge",
          when: (r, u) => r.status === "Approved" && own(r, u),
          fields: [],
        },
      ],
    },
    assets: {
      title: "Assets & equipment",
      description: "The right tools, in the right hands, with a clear history.",
      endpoint: "/assets",
      create: "Register asset",
      permission: "assets.manage",
      fields: [
        f("name", "Asset name"),
        f("category", "Category"),
        f("serial", "Serial number"),
        f("brand", "Brand", "text", { required: false }),
        f("model", "Model", "text", { required: false }),
        f("purchaseDate", "Purchase date", "date"),
        f("warrantyExpiry", "Warranty expiry", "date"),
        select("condition", "Condition", ["New", "Good", "Fair", "Damaged"]),
      ],
      initial: { condition: "New" },
      columns: [
        { label: "Asset", key: "name" },
        { label: "Serial", key: "serial" },
        employee,
        { label: "Condition", key: "condition" },
        status,
      ],
      actions: [
        {
          label: "Allocate",
          endpoint: "allocate",
          permission: "assets.manage",
          when: (r) => r.status === "Available",
          fields: [employeeField],
        },
        {
          label: "Record return",
          endpoint: "return",
          permission: "assets.manage",
          when: (r) => r.status === "Assigned",
          fields: [
            select("condition", "Return condition", [
              "New",
              "Good",
              "Fair",
              "Damaged",
            ]),
          ],
        },
        {
          label: "Update status",
          endpoint: "status",
          permission: "assets.manage",
          when: (r) => r.status !== "Assigned",
          fields: [
            select("status", "Status", [
              "Available",
              "Under Repair",
              "Retired",
            ]),
          ],
        },
      ],
    },
    exits: {
      title: "Exit & offboarding",
      description: "A respectful transition, with every detail taken care of.",
      endpoint: "/exits",
      create: "Submit resignation",
      fields: [
        f("resignationDate", "Resignation date", "date"),
        f("lastWorkingDate", "Last working date", "date"),
        select("separationType", "Separation type", [
          "Resignation",
          "Retirement",
          "Contract End",
        ]),
        f("reason", "Reason", "textarea", { full: true }),
        f("handover", "Handover plan", "textarea", { full: true }),
      ],
      initial: { resignationDate: today(), separationType: "Resignation" },
      columns: [
        employee,
        { label: "Resignation", key: "resignationDate" },
        { label: "Last day", key: "lastWorkingDate" },
        status,
      ],
      actions: [
        {
          label: "Record exit interview",
          endpoint: "interview",
          permission: "exit.manage",
          when: (r, u) =>
            !["Completed", "Rejected"].includes(r.status) && !own(r, u),
          fields: [
            f("summary", "Interview summary", "textarea"),
            f("improvements", "Suggested improvements", "textarea"),
            f("wouldRehire", "Eligible for rehire", "checkbox"),
          ],
        },
        {
          label: "Review transition",
          endpoint: "transition",
          permission: "exit.manage",
          when: (r, u) =>
            !["Completed", "Rejected"].includes(r.status) && !own(r, u),
          fields: (r) => [
            select(
              "status",
              "Next step",
              {
                Requested: ["Under Review", "Rejected"],
                "Under Review": ["Approved", "Rejected"],
                Approved: ["Notice Period"],
                "Notice Period": ["Clearance"],
                Clearance: ["Settlement"],
                Settlement: ["Completed"],
              }[r.status] || [],
            ),
            note,
            f("handoverComplete", "Handover complete", "checkbox"),
            f("documentsComplete", "Documents complete", "checkbox"),
            f("settlementReviewed", "Settlement reviewed", "checkbox"),
          ],
        },
      ],
    },
    notifications: {
      title: "Notifications",
      description: "The updates that keep your workday connected.",
      endpoint: "/notifications",
      columns: [
        { label: "Update", key: "title" },
        { label: "Message", key: "body", wrap: true },
        {
          label: "Received",
          render: (r) => new Date(r.createdAt).toLocaleString("en-IN"),
        },
        { label: "Read", render: (r) => (r.readAt ? "Read" : "Unread") },
      ],
      actions: [
        {
          label: "Mark read",
          endpoint: "read",
          when: (r) => !r.readAt,
          fields: [],
        },
      ],
    },
    documents: {
      title: "Documents",
      description:
        "Your important records, securely stored and carefully shared.",
      endpoint: "/documents",
      create: "Upload document",
      permission: null,
      multipart: true,
      fields: [
        ...(can(user, "documents.manage") ? [employeeField] : []),
        f("name", "Document name"),
        select("category", "Category", [
          "Identity Documents",
          "Employment Letters",
          "Educational Certificates",
          "Experience Certificates",
          "HR Policies",
          "Other Records",
        ]),
        ...(can(user, "documents.manage")
          ? [select("visibility", "Visibility", ["Employee", "HR Only"])]
          : []),
        f("expiresAt", "Expiry date", "date", { required: false }),
        f("file", "File (PDF, PNG or JPEG, max 8 MB)", "file", {
          accept: ".pdf,.png,.jpg,.jpeg",
          full: true,
        }),
      ],
      initial: { visibility: "Employee" },
      columns: [
        { label: "Document", key: "name" },
        employee,
        { label: "Category", key: "category" },
        { label: "Visibility", key: "visibility" },
        status,
      ],
      actions: [
        {
          label: "Download",
          run: async (record) => {
            const access = (await api.post(`/documents/${record._id}/access`))
              .data.data;
            await download(
              access.url.replace("/api/v1", ""),
              record.name +
                "." +
                (record.versions.at(-1)?.mime === "application/pdf"
                  ? "pdf"
                  : record.versions.at(-1)?.mime === "image/png"
                    ? "png"
                    : "jpg"),
            );
          },
        },
        {
          label: "New version",
          endpoint: "versions",
          multipart: true,
          fields: [
            f("file", "Replacement file", "file", {
              accept: ".pdf,.png,.jpg,.jpeg",
            }),
          ],
        },
        {
          label: "Verify",
          endpoint: "verify",
          permission: "documents.manage",
          when: (r, u) => !own(r, u),
          fields: [
            select("status", "Verification", ["Verified", "Rejected"]),
            note,
          ],
        },
      ],
    },
  };
}
export default function OperationsPage({ module, user }) {
  const config = resourceConfigs(user)[module];
  return config ? (
    <ResourcePage key={module} config={config} user={user} />
  ) : null;
}
