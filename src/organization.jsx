import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Plus, Building2, X, ArrowRight } from "lucide-react";
import { api, get, errorMessage } from "./api";
import { Dialog } from "./components/ResourcePage";

export default function Organization() {
  const [kind, setKind] = useState("departments"),
    [editing, setEditing] = useState(null),
    [confirm, setConfirm] = useState(null);
  const [members, setMembers] = useState(null);
  const qc = useQueryClient();
  const { data, isPending, error } = useQuery({
    queryKey: ["organization", kind],
    queryFn: () => get(`/organization/${kind}`),
  });
  const deactivate = useMutation({
    mutationFn: (id) => api.post(`/organization/${kind}/${id}/deactivate`),
    onSuccess: () => {
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ["organization"] });
    },
  });
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">THE WAY YOUR TEAM WORKS</span>
          <h1>Organization</h1>
          <p>A shared foundation for your people and operations.</p>
        </div>
        <button className="primary" onClick={() => setEditing({})}>
          <Plus size={17} />
          Add {kind.slice(0, -1)}
        </button>
      </div>
      <div className="info-note">
        <Building2 size={19} />
        <span>
          Manage organization records here. Set employee assignments in each
          employee profile and effective-dated schedules in Attendance.
        </span>
      </div>
      <section className="panel">
        <div className="directory-head">
          <div className="tabs">
            {["departments", "designations", "branches", "shifts"].map((k) => (
              <button
                key={k}
                className={kind === k ? "selected" : ""}
                onClick={() => setKind(k)}
              >
                {k[0].toUpperCase() + k.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {isPending ? (
          <div className="loading">
            <div />
            <div />
          </div>
        ) : error ? (
          <div className="notice" role="alert">
            {errorMessage(error)}
          </div>
        ) : !data.data.length ? (
          <div className="empty">
            <div className="empty-icon">
              <Building2 size={25} />
            </div>
            <h3>Your organization, thoughtfully structured</h3>
            <p>Add your first {kind.slice(0, -1)} to get started.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>NAME</th>
                  <th>CODE</th>
                  <th>{kind === "shifts" ? "SCHEDULE" : "DESCRIPTION"}</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((item) => (
                  <tr key={item._id}>
                    <td>
                      <strong className="cell-title">{item.name}</strong>
                      {kind === "branches" && (
                        <small className="cell-sub">{item.timezone}</small>
                      )}
                      {item.level && (
                        <small className="cell-sub">Level {item.level}</small>
                      )}
                    </td>
                    <td>{item.code}</td>
                    <td>
                      {kind === "shifts"
                        ? `${item.startTime} – ${item.endTime}`
                        : item.description || "—"}
                    </td>
                    <td>
                      <span
                        className={`badge ${item.active ? "active" : "archived"}`}
                      >
                        <i />
                        {item.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        {kind !== "shifts" && (
                          <button
                            className="text-button"
                            onClick={() => setMembers(item)}
                          >
                            Employees
                          </button>
                        )}
                        <button
                          className="text-button"
                          onClick={() => setEditing(item)}
                        >
                          Edit
                        </button>
                        {item.active && (
                          <button
                            className="text-button"
                            onClick={() => setConfirm(item)}
                          >
                            Deactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {editing && (
        <OrganizationForm
          key={editing._id || kind}
          kind={kind}
          item={editing}
          onClose={() => setEditing(null)}
        />
      )}
      {members && (
        <OrganizationMembers
          kind={kind}
          record={members}
          onClose={() => setMembers(null)}
        />
      )}
      {confirm && (
        <div className="confirmation-backdrop">
          <section
            className="confirmation"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
          >
            <h2 id="confirm-title">Deactivate {confirm.name}?</h2>
            <p>Historical records will be retained.</p>
            {deactivate.isError && (
              <div className="notice">{errorMessage(deactivate.error)}</div>
            )}
            <div className="form-footer">
              <button className="secondary" onClick={() => setConfirm(null)}>
                Cancel
              </button>
              <button
                className="danger"
                disabled={deactivate.isPending}
                onClick={() => deactivate.mutate(confirm._id)}
              >
                Deactivate
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
function OrganizationForm({ kind, item, onClose }) {
  const people = useQuery({
    queryKey: ["organization-employee-options"],
    queryFn: () => get("/lookups/employees"),
  });
  const parents = useQuery({
    queryKey: ["organization", kind],
    queryFn: () => get(`/organization/${kind}`),
  });
  const { register, handleSubmit } = useForm({
    defaultValues: {
      timezone: "Asia/Kolkata",
      graceMinutes: 0,
      ...item,
      head: item.head || "",
      parent: item.parent || "",
    },
  });
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: (input) => {
      const values = Object.fromEntries(
        Object.entries(input).filter(
          ([, value]) =>
            !(typeof value === "number" && !Number.isFinite(value)),
        ),
      );
      return item._id
        ? api.patch(`/organization/${kind}/${item._id}`, values)
        : api.post(`/organization/${kind}`, values);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["organization"] });
      onClose();
    },
  });
  return (
    <div className="confirmation-backdrop">
      <section
        className="confirmation"
        role="dialog"
        aria-modal="true"
        aria-labelledby="organization-form-title"
      >
        <div className="modal-title">
          <h2 id="organization-form-title">
            {item._id ? "Edit" : "Add"} {kind.slice(0, -1)}
          </h2>
          <button className="icon-button" aria-label="Close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit((input) => save.mutate(input))}>
          <div className="form-grid">
            <label>
              Name
              <input required maxLength={100} {...register("name")} />
            </label>
            <label>
              Code
              <input required maxLength={30} {...register("code")} />
            </label>
            <label className="full">
              Description
              <textarea maxLength={500} {...register("description")} />
            </label>
            {kind === "departments" && (
              <label>
                Department head
                <select {...register("head")}>
                  <option value="">Unassigned</option>
                  {people.data?.data.map((e) => (
                    <option key={e._id} value={e._id}>
                      {e.firstName} {e.lastName} - {e.code}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {["departments", "branches"].includes(kind) && (
              <label>
                Parent {kind.slice(0, -1)}
                <select {...register("parent")}>
                  <option value="">Top level</option>
                  {parents.data?.data
                    .filter((p) => p._id !== item._id && p.active)
                    .map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </label>
            )}
            {kind === "designations" && (
              <label>
                Designation level
                <input
                  type="number"
                  min={1}
                  max={100}
                  {...register("level", { valueAsNumber: true })}
                />
              </label>
            )}
            {kind === "branches" && (
              <label className="full">
                Office address
                <textarea {...register("address")} />
              </label>
            )}
            {kind === "branches" && (
              <label className="full">
                Timezone
                <input required {...register("timezone")} />
              </label>
            )}
            {kind === "shifts" && (
              <>
                <label>
                  Start time
                  <input type="time" required {...register("startTime")} />
                </label>
                <label>
                  End time
                  <input type="time" required {...register("endTime")} />
                </label>
                <label>
                  Grace period (minutes)
                  <input
                    type="number"
                    min={0}
                    max={120}
                    required
                    {...register("graceMinutes", { valueAsNumber: true })}
                  />
                </label>
              </>
            )}
          </div>
          {save.isError && (
            <div className="notice" role="alert">
              {errorMessage(save.error)}
            </div>
          )}
          <div className="form-footer">
            <button type="button" className="secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="primary" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save record"}
              <ArrowRight size={16} />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
function OrganizationMembers({ kind, record, onClose }) {
  const query = useQuery({
    queryKey: ["organization-members", record._id],
    queryFn: () => get(`/organization/${kind}/${record._id}/employees`),
  });
  return (
    <Dialog title={`${record.name} employees`} onClose={onClose}>
      {query.isPending ? (
        <p>Loading employees...</p>
      ) : query.error ? (
        <div className="notice" role="alert">
          {errorMessage(query.error)}
        </div>
      ) : query.data.data.length ? (
        <div className="insight-events">
          {query.data.data.map((e) => (
            <div key={e._id}>
              <strong>
                {e.firstName} {e.lastName}
              </strong>
              <span>
                {e.code} - {e.designation}
              </span>
              <span className="badge">{e.status}</span>
            </div>
          ))}
        </div>
      ) : (
        <p>No employees are assigned to this record.</p>
      )}
    </Dialog>
  );
}
