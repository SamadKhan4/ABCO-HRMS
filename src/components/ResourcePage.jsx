import React, { useEffect, useRef, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  X,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  FileText,
  Download,
} from "lucide-react";
import { api, get, errorMessage } from "../api";

export const can = (user, permission) =>
  !permission || user.permissions.some((p) => p === "*" || p === permission);
export const person = (value) =>
  value && typeof value === "object"
    ? `${value.firstName || ""} ${value.lastName || ""}`.trim() ||
      value.name ||
      value.title
    : (value ?? "—");
export const currency = (amount) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    (amount || 0) / 100,
  );
export const employeeField = {
  name: "employee",
  label: "Employee",
  type: "select",
  source: "employees",
  required: true,
};
export async function download(path, name) {
  try {
    const result = await api.get(path, { responseType: "blob" });
    const url = URL.createObjectURL(result.data);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    if (error.response?.data instanceof Blob) {
      try {
        error.response.data = JSON.parse(await error.response.data.text());
      } catch {}
    }
    throw error;
  }
}
export function Dialog({ title, onClose, children }) {
  const dialog = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current.showModal();
    return () => previous?.focus();
  }, []);
  return (
    <dialog ref={dialog} className="modal resource-modal" onCancel={onClose}>
      <div className="modal-title">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function ArrayFields({ field, control, register, lookups }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: field.name,
  });
  return (
    <fieldset className="array-field full">
      <legend>{field.label}</legend>
      {fields.map((item, index) => (
        <div className="array-row" key={item.id}>
          {field.fields.map((child) => (
            <Input
              key={child.name}
              field={{ ...child, name: `${field.name}.${index}.${child.name}` }}
              register={register}
              control={control}
              lookups={lookups}
            />
          ))}
          <button
            type="button"
            className="icon-button array-remove"
            onClick={() => remove(index)}
            aria-label={`Remove ${field.label} row ${index + 1}`}
          >
            <X size={16} />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="secondary"
        onClick={() =>
          append(
            Object.fromEntries(
              field.fields.map((child) => [child.name, child.default ?? ""]),
            ),
          )
        }
      >
        <Plus size={15} />
        Add {field.itemLabel || "item"}
      </button>
    </fieldset>
  );
}
function Input({ field, register, control, lookups }) {
  if (field.type === "array")
    return (
      <ArrayFields
        field={field}
        control={control}
        register={register}
        lookups={lookups}
      />
    );
  const options = field.options || lookups[field.source] || [];
  const rules = {
    required: field.required !== false,
    valueAsNumber: field.type === "number",
  };
  const props = {
    ...register(field.name, rules),
    "aria-label": field.label,
    required: field.required !== false,
    disabled: field.disabled,
  };
  return (
    <label className={field.full ? "full" : ""}>
      {field.label}
      {field.type === "textarea" ? (
        <textarea
          {...props}
          minLength={field.minLength || 3}
          maxLength={field.maxLength || 5000}
        />
      ) : field.type === "select" ? (
        <select {...props}>
          <option value="">Select {field.label.toLowerCase()}</option>
          {options.map((option) => (
            <option
              key={typeof option === "string" ? option : option.value}
              value={typeof option === "string" ? option : option.value}
            >
              {typeof option === "string" ? option : option.label}
            </option>
          ))}
        </select>
      ) : field.type === "checkbox" ? (
        <span className="checkbox-field">
          <input
            type="checkbox"
            aria-label={field.label}
            {...register(field.name)}
          />
          {field.hint || "Yes"}
        </span>
      ) : (
        <input
          {...props}
          type={field.type || "text"}
          min={field.min}
          max={field.max}
          step={field.step}
          maxLength={field.maxLength || 500}
          minLength={field.minLength}
          accept={field.accept}
        />
      )}
      {field.help && <small className="input-help">{field.help}</small>}
    </label>
  );
}
export function ResourceForm({
  title,
  fields,
  initial = {},
  lookups = {},
  submitLabel = "Save",
  onClose,
  onSubmit,
}) {
  const { register, handleSubmit, control } = useForm({
    defaultValues: initial,
  });
  const mutation = useMutation({ mutationFn: onSubmit, onSuccess: onClose });
  return (
    <Dialog title={title} onClose={onClose}>
      <form onSubmit={handleSubmit((values) => mutation.mutate(values))}>
        <div className="form-grid">
          {fields.map((field) => (
            <Input
              key={field.name}
              field={field}
              register={register}
              control={control}
              lookups={lookups}
            />
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
            {mutation.isPending ? "Saving…" : submitLabel}
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </Dialog>
  );
}
function DetailValue({ value }) {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value))
    return (
      <div className="detail-list">
        {value.map((item, i) => (
          <div key={item._id || i}>
            {typeof item === "object"
              ? Object.entries(item)
                  .filter(
                    ([key]) =>
                      ![
                        "_id",
                        "key",
                        "actor",
                        "author",
                        "createdBy",
                        "employee",
                        "owner",
                        "__v",
                      ].includes(key),
                  )
                  .map(([key, v]) => (
                    <div key={key}>
                      <strong>{key.replaceAll(/([A-Z])/g, " $1")}: </strong>
                      <DetailValue value={v} />
                    </div>
                  ))
              : String(item)}
          </div>
        ))}
      </div>
    );
  if (typeof value === "object") return person(value);
  return String(value);
}
export default function ResourcePage({ config, user }) {
  const [page, setPage] = useState(1),
    [modal, setModal] = useState(null),
    [details, setDetails] = useState(null),
    [actionError, setActionError] = useState(null);
  const qc = useQueryClient();
  useEffect(() => {
    setPage(1);
    setModal(null);
    setDetails(null);
  }, [config.endpoint]);
  const query = useQuery({
    queryKey: ["resource", config.endpoint, page],
    queryFn: () =>
      get(
        `${config.endpoint}${config.endpoint.includes("?") ? "&" : "?"}page=${page}&limit=20`,
      ),
  });
  const employees = useQuery({
    queryKey: ["employee-lookups"],
    queryFn: () => get("/lookups/employees"),
    staleTime: 60000,
  });
  const jobs = useQuery({
    queryKey: ["job-lookups"],
    queryFn: () => get("/recruitment/jobs?limit=100"),
    enabled: config.needsJobs === true,
  });
  const projects = useQuery({
    queryKey: ["project-lookups"],
    queryFn: () => get("/projects?limit=100"),
    enabled: config.needsProjects === true,
  });
  const policies = useQuery({
    queryKey: ["expense-policy-lookups"],
    queryFn: () => get("/expense-policies?limit=100"),
    enabled: config.needsPolicies === true,
  });
  const documents = useQuery({
    queryKey: ["document-lookups"],
    queryFn: () => get("/documents?limit=100"),
    enabled: config.needsDocuments === true,
  });
  const travel = useQuery({
    queryKey: ["travel-lookups"],
    queryFn: () => get("/travel?limit=100"),
    enabled: config.needsTravel === true,
  });
  const approvalRoles = useQuery({
    queryKey: ["approval-role-lookups"],
    queryFn: () => get("/approval-role-lookups"),
    enabled: config.needsApprovalRoles === true,
  });
  const approvalUsers = useQuery({
    queryKey: ["approval-user-lookups"],
    queryFn: () => get("/approval-user-lookups"),
    enabled: config.needsApprovalUsers === true,
  });
  const reviews = useQuery({
    queryKey: ["performance-lookups"],
    queryFn: () => get("/performance?limit=100"),
    enabled: config.needsReviews === true && can(user, "performance.manage"),
  });
  const templates = useQuery({
    queryKey: ["template-lookups"],
    queryFn: () => get("/document-templates?limit=100"),
    enabled: config.needsTemplates === true && can(user, "documents.manage"),
  });
  const assets = useQuery({
    queryKey: ["asset-lookups"],
    queryFn: () => get("/assets?limit=100"),
    enabled: config.needsAssets === true && can(user, "assets.manage"),
  });
  const loanPolicies = useQuery({
    queryKey: ["loan-policy-lookups"],
    queryFn: () => get("/loan-policies?limit=100"),
    enabled: config.needsLoanPolicies === true,
  });
  const settlementExits = useQuery({
    queryKey: ["settlement-exit-lookups"],
    queryFn: () => get("/settlement-exit-lookups"),
    enabled: config.needsSettlementExits === true && can(user, "payroll.view"),
  });
  const swapColleagues = useQuery({
    queryKey: ["shift-swap-colleagues"],
    queryFn: () => get("/shift-swap-colleagues"),
    enabled: config.needsSwapColleagues === true,
  });
  const lookups = {
    swapColleagues: (swapColleagues.data?.data || []).map((r) => ({
      value: r._id,
      label: person(r) + " ? " + r.code,
    })),
    loanPolicies: (loanPolicies.data?.data || []).map((r) => ({
      value: r._id,
      label: r.name,
    })),
    settlementExits: (settlementExits.data?.data || []).map((r) => ({
      value: r._id,
      label: person(r.employee) + " · " + r.lastWorkingDate,
    })),
    reviews: (reviews.data?.data || []).map((r) => ({
      value: r._id,
      label: r.title + " · " + person(r.employee),
    })),
    templates: (templates.data?.data || [])
      .filter((r) => r.active)
      .map((r) => ({ value: r._id, label: r.name + " · " + r.kind })),
    assets: (assets.data?.data || [])
      .filter((r) => ["Available", "Under Repair"].includes(r.status))
      .map((r) => ({ value: r._id, label: r.name + " · " + r.serial })),
    projects: (projects.data?.data || []).map((r) => ({
      value: r._id,
      label: r.name,
    })),
    policies: (policies.data?.data || [])
      .filter((r) => r.active)
      .map((r) => ({ value: r._id, label: r.name })),
    documents: (documents.data?.data || [])
      .filter(
        (r) => String(r.employee?._id || r.employee) === String(user.employee),
      )
      .map((r) => ({ value: r._id, label: r.name })),
    travel: (travel.data?.data || [])
      .filter(
        (r) => String(r.employee?._id || r.employee) === String(user.employee),
      )
      .map((r) => ({ value: r._id, label: r.destination })),
    approvalRoles: (approvalRoles.data?.data || []).map((r) => ({
      value: r._id,
      label: r.name,
    })),
    approvalUsers: (approvalUsers.data?.data || []).map((r) => ({
      value: r._id,
      label: r.name,
    })),
    employees: (employees.data?.data || []).map((e) => ({
      value: e._id,
      label: `${person(e)} · ${e.code}`,
    })),
    jobs: (jobs.data?.data || []).map((job) => ({
      value: job._id,
      label: job.title,
    })),
  };
  const refresh = () => qc.invalidateQueries();
  const actionsFor = (record) =>
    [
      ...(config.edit
        ? [
            {
              label: "Edit",
              method: "patch",
              endpoint: (r) => config.endpoint.split("?")[0] + "/" + r._id,
              permission: config.edit.permission,
              when: config.edit.when,
              fields: config.fields,
              initial: config.edit.initial || ((r) => r),
              prepare: config.prepare,
            },
          ]
        : []),
      ...(config.actions || []),
    ].filter(
      (action) =>
        can(user, action.permission) &&
        (!action.when || action.when(record, user)),
    );
  function startAction(action, record) {
    setActionError(null);
    if (action.run) {
      Promise.resolve(action.run(record)).then(refresh).catch(setActionError);
      return;
    }
    setModal({ action, record });
  }
  async function submit(values) {
    const { action, record } = modal;
    let payload = action
      ? action.prepare
        ? action.prepare(values, record)
        : values
      : config.prepare
        ? config.prepare(values)
        : values;
    const endpoint = action
      ? typeof action.endpoint === "function"
        ? action.endpoint(record)
        : `${config.endpoint}/${record._id}/${action.endpoint}`
      : config.endpoint;
    if (action?.multipart || (config.multipart && !action)) {
      const form = new FormData();
      for (const [key, value] of Object.entries(payload)) {
        if (value instanceof FileList) {
          if (value[0]) form.append(key, value[0]);
        } else if (value != null) form.append(key, String(value));
      }
      payload = form;
    }
    await api[action?.method || "post"](endpoint, payload);
    await refresh();
  }
  const rows = query.data?.data || [];
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            {config.eyebrow || "PEOPLE & OPERATIONS"}
          </span>
          <h1>{config.title}</h1>
          <p>{config.description}</p>
        </div>
        {config.create && can(user, config.permission) && (
          <button className="primary" onClick={() => setModal({})}>
            <Plus size={17} />
            {config.create}
          </button>
        )}
      </div>
      {config.note && (
        <div className="info-note">
          <FileText size={18} />
          {config.note}
        </div>
      )}
      {actionError && (
        <div className="notice" role="alert">
          {errorMessage(actionError)}
        </div>
      )}
      <section className="panel resource-panel">
        {query.isPending ? (
          <div className="loading">
            <div />
            <div />
            <div />
          </div>
        ) : query.error ? (
          <div className="resource-error">
            <div className="notice" role="alert">
              {errorMessage(query.error)}
            </div>
            <button className="secondary" onClick={() => query.refetch()}>
              Try again
            </button>
          </div>
        ) : !rows.length ? (
          <div className="empty">
            <div className="empty-icon">
              <FileText size={26} />
            </div>
            <h3>{config.emptyTitle || "A fresh page for your team"}</h3>
            <p>
              {config.emptyText ||
                "Your records will appear here as your team gets started."}
            </p>
          </div>
        ) : (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    {config.columns.map((column) => (
                      <th key={column.label}>{column.label.toUpperCase()}</th>
                    ))}
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((record) => (
                    <tr key={record._id}>
                      {config.columns.map((column) => (
                        <td
                          className={column.wrap ? "reason-cell" : ""}
                          key={column.label}
                        >
                          {column.render ? (
                            column.render(record)
                          ) : column.status ? (
                            <span
                              className={`badge ${String(record[column.key]).toLowerCase().replaceAll(" ", "-")}`}
                            >
                              <i />
                              {record[column.key]}
                            </span>
                          ) : (
                            person(record[column.key])
                          )}
                        </td>
                      ))}
                      <td>
                        <div className="resource-actions">
                          <button
                            className="text-button"
                            onClick={() => setDetails(record)}
                          >
                            Details
                          </button>
                          {actionsFor(record).map((action) => (
                            <button
                              key={action.label}
                              className="text-button"
                              onClick={() => startAction(action, record)}
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <span>{query.data.meta?.total ?? rows.length} records</span>
              <div>
                <button
                  className="secondary"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft size={14} />
                  Previous
                </button>
                <span>{page}</span>
                <button
                  className="secondary"
                  disabled={!query.data.meta || page >= query.data.meta.pages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>
      {modal && (
        <ResourceForm
          key={`${modal.record?._id || "new"}-${modal.action?.label || config.title}`}
          title={modal.action?.label || config.create}
          fields={
            typeof modal.action?.fields === "function"
              ? modal.action.fields(modal.record)
              : modal.action?.fields || config.fields || []
          }
          initial={
            typeof modal.action?.initial === "function"
              ? modal.action.initial(modal.record)
              : modal.action?.initial || config.initial || {}
          }
          lookups={lookups}
          onClose={() => setModal(null)}
          onSubmit={submit}
          submitLabel={modal.action?.label || "Save"}
        />
      )}
      {details && (
        <Dialog
          title={config.singular || "Record details"}
          onClose={() => setDetails(null)}
        >
          <dl className="record-details">
            {Object.entries(details)
              .filter(([key]) => !["_id", "__v", "updatedAt"].includes(key))
              .map(([key, value]) => (
                <div key={key}>
                  <dt>{key.replaceAll(/([A-Z])/g, " $1")}</dt>
                  <dd>
                    <DetailValue value={value} />
                  </dd>
                </div>
              ))}
          </dl>
          {config.detailContent?.(details, { refresh, user, lookups })}
        </Dialog>
      )}
    </>
  );
}
