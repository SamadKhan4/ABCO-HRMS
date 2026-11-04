import React from "react";
import ResourcePage, {
  employeeField,
  person,
  download,
} from "../components/ResourcePage";
import { api } from "../api";
const f = (name, label, type = "text", extra = {}) => ({
    name,
    label,
    type,
    ...extra,
  }),
  select = (name, label, options) => f(name, label, "select", { options });
const status = { label: "Status", key: "status", status: true },
  employee = { label: "Employee", render: (record) => person(record.employee) };
const own = (record, user) =>
  String(record.employee?._id || record.employee) === String(user.employee);
export function growthConfigs() {
  return {
    "peer-feedback": {
      title: "360-degree feedback",
      description:
        "Gather thoughtful input from the colleagues who work together.",
      endpoint: "/peer-feedback",
      needsReviews: true,
      create: "Request peer feedback",
      permission: "performance.manage",
      fields: [
        f("review", "Performance review", "select", { source: "reviews" }),
        { ...employeeField, name: "reviewer", label: "Feedback reviewer" },
      ],
      columns: [
        employee,
        { label: "Review", render: (r) => r.review?.title },
        { label: "Reviewer", render: (r) => person(r.reviewer) },
        { label: "Rating", render: (r) => (r.rating ? `${r.rating}/5` : "—") },
        status,
      ],
      actions: [
        {
          label: "Submit feedback",
          endpoint: "respond",
          when: (r, u) =>
            r.status === "Requested" &&
            String(r.reviewer?._id || r.reviewer) === String(u.employee),
          fields: [
            f("rating", "Rating (1–5)", "number", { min: 1, max: 5 }),
            f("feedback", "Feedback", "textarea", { full: true }),
          ],
        },
      ],
    },
    "improvement-plans": {
      title: "Performance improvement plans",
      description:
        "Clear expectations, supportive check-ins and a documented review.",
      endpoint: "/improvement-plans",
      create: "Create improvement plan",
      permission: "performance.manage",
      fields: [
        employeeField,
        f("title", "Plan title"),
        f("reason", "Reason", "textarea", { full: true }),
        f("goals", "Expected improvements", "textarea", { full: true }),
        f("startDate", "Start date", "date"),
        f("endDate", "End date", "date"),
      ],
      columns: [
        employee,
        { label: "Plan", key: "title" },
        { label: "Review date", key: "endDate" },
        status,
      ],
      actions: [
        {
          label: "Record check-in",
          endpoint: "check-in",
          when: (r) => r.status === "Active",
          fields: [
            f("progress", "Progress (%)", "number", { min: 0, max: 100 }),
            f("notes", "Check-in notes", "textarea"),
          ],
        },
        {
          label: "Close plan",
          endpoint: "close",
          permission: "performance.manage",
          when: (r, u) => r.status === "Active" && !own(r, u),
          fields: [
            select("status", "Outcome", ["Completed", "Cancelled"]),
            f("note", "Review note", "textarea"),
          ],
        },
      ],
    },
    "appraisal-recommendations": {
      title: "Appraisal recommendations",
      description:
        "Recommendations stay separate from authorized salary and employment changes.",
      endpoint: "/appraisal-recommendations",
      create: "Create recommendation",
      permission: "performance.manage",
      fields: [
        employeeField,
        select("kind", "Recommendation", ["Increment", "Promotion"]),
        f("incrementPercent", "Proposed increment (%)", "number", {
          min: 0,
          max: 100,
          step: 0.01,
          required: false,
        }),
        f("proposedDesignation", "Proposed designation", "text", {
          required: false,
        }),
        f("reason", "Recommendation reason", "textarea", { full: true }),
      ],
      prepare: (input) => ({
        ...input,
        ...(Number.isFinite(input.incrementPercent)
          ? { incrementBasisPoints: Math.round(input.incrementPercent * 100) }
          : {}),
        proposedDesignation: input.proposedDesignation || undefined,
      }),
      columns: [
        employee,
        { label: "Recommendation", key: "kind" },
        {
          label: "Proposal",
          render: (r) =>
            r.kind === "Increment"
              ? `${r.incrementBasisPoints / 100}%`
              : r.proposedDesignation,
        },
        status,
      ],
      actions: [
        {
          label: "Review increment",
          endpoint: "review",
          permission: "payroll.approve",
          when: (r, u) =>
            r.kind === "Increment" &&
            r.status === "Pending" &&
            r.createdBy !== u.id &&
            !own(r, u),
          fields: [
            select("status", "Decision", ["Approved", "Rejected"]),
            f("note", "Review note", "textarea"),
          ],
        },
        {
          label: "Review promotion",
          endpoint: "review",
          permission: "performance.approve",
          when: (r, u) =>
            r.kind === "Promotion" &&
            r.status === "Pending" &&
            r.createdBy !== u.id &&
            !own(r, u),
          fields: [
            select("status", "Decision", ["Approved", "Rejected"]),
            f("note", "Review note", "textarea"),
          ],
        },
      ],
    },
    "document-templates": {
      title: "Document templates",
      description:
        "Use company-approved wording. No legal or employment terms are assumed.",
      endpoint: "/document-templates",
      create: "Create document template",
      permission: "documents.manage",
      note: "Available placeholders include {{companyName}}, {{employeeName}}, {{employeeCode}}, {{department}}, {{designation}}, {{joiningDate}}, {{lastWorkingDate}}, {{candidateName}}, {{jobTitle}} and {{date}}.",
      fields: [
        f("name", "Template name"),
        select("kind", "Letter type", [
          "Offer",
          "Appointment",
          "Experience",
          "Relieving",
        ]),
        f("body", "Approved letter wording", "textarea", {
          full: true,
          minLength: 20,
          maxLength: 20000,
        }),
      ],
      columns: [
        { label: "Template", key: "name" },
        { label: "Type", key: "kind" },
        { label: "Status", render: (r) => (r.active ? "Active" : "Inactive") },
      ],
      actions: [
        {
          label: "Deactivate",
          endpoint: "deactivate",
          permission: "documents.manage",
          when: (r) => r.active,
          fields: [],
        },
      ],
    },
    "generated-letters": {
      title: "Official letters",
      description:
        "Generate private PDFs from approved templates and persisted employee records.",
      endpoint: "/generated-letters",
      create: "Generate employee letter",
      permission: "documents.manage",
      needsTemplates: true,
      fields: [
        employeeField,
        f("template", "Letter template", "select", { source: "templates" }),
        f("customFields", "Additional template values", "array", {
          itemLabel: "value",
          fields: [f("name", "Placeholder name"), f("value", "Value")],
        }),
      ],
      initial: { customFields: [] },
      prepare: (input) => ({
        employee: input.employee,
        template: input.template,
        custom: Object.fromEntries(
          (input.customFields || []).map((item) => [item.name, item.value]),
        ),
      }),
      columns: [
        { label: "Letter", key: "name" },
        employee,
        { label: "Type", key: "category" },
        {
          label: "Created",
          render: (r) => new Date(r.createdAt).toLocaleDateString("en-IN"),
        },
      ],
      actions: [
        {
          label: "Download",
          run: async (record) => {
            const access = (
              await api.post(`/documents/${record._id}/access`, {})
            ).data.data;
            await download(
              access.url.replace("/api/v1", ""),
              record.name + ".pdf",
            );
          },
        },
      ],
    },
    "asset-maintenance": {
      title: "Asset maintenance",
      description:
        "Track equipment care and preserve every maintenance record.",
      endpoint: "/asset-maintenance",
      create: "Open maintenance",
      permission: "assets.manage",
      needsAssets: true,
      fields: [
        f("asset", "Asset", "select", { source: "assets" }),
        f("startDate", "Start date", "date"),
        f("description", "Issue description", "textarea", { full: true }),
      ],
      columns: [
        { label: "Asset", render: (r) => r.asset?.name },
        { label: "Serial", render: (r) => r.asset?.serial },
        { label: "Started", key: "startDate" },
        status,
      ],
      actions: [
        {
          label: "Complete maintenance",
          endpoint: "complete",
          permission: "assets.manage",
          when: (r) => r.status === "Open",
          fields: [
            f("endDate", "Completed on", "date"),
            f("resolution", "Resolution", "textarea"),
            select("condition", "Condition", [
              "New",
              "Good",
              "Fair",
              "Damaged",
            ]),
            f("retire", "Retire this asset", "checkbox"),
          ],
        },
      ],
    },
  };
}
export default function GrowthPage({ module, user }) {
  return <ResourcePage config={growthConfigs()[module]} user={user} />;
}
