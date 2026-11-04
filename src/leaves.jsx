import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Plus, CalendarDays, X, Check } from "lucide-react";
import { api, get, errorMessage } from "./api";

export default function Leaves({ user }) {
  const canApprove = user.permissions.some((p) =>
    ["*", "leave.approve"].includes(p),
  );
  const canManage = user.permissions.some((p) =>
    ["*", "organization.manage"].includes(p),
  );
  const [tab, setTab] = useState(user.isSuperAdmin ? "team" : "mine"),
    [modal, setModal] = useState(null),
    [decision, setDecision] = useState(null),
    [reason, setReason] = useState("");
  const qc = useQueryClient();
  const { data, isPending, error } = useQuery({
    queryKey: ["leaves", tab],
    queryFn: () => get(tab === "team" ? "/leaves" : "/leaves/me"),
  });
  const policies = useQuery({
    queryKey: ["leave-policies"],
    queryFn: () => get("/leave-policies"),
  });
  const balances = useQuery({
    queryKey: ["leave-balances"],
    queryFn: () => get("/leave-balances/me"),
    enabled: !user.isSuperAdmin,
  });
  const mutation = useMutation({
    mutationFn: ({ id, action, approve }) =>
      api.post(`/leaves/${id}/${action}`, {
        reason,
        ...(approve === undefined ? {} : { approve }),
      }),
    onSuccess: () => {
      qc.invalidateQueries();
      setDecision(null);
      setReason("");
    },
  });
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ROOM TO RECHARGE</span>
          <h1>Time off</h1>
          <p>Plan a little balance. Keep your team in the loop.</p>
        </div>
        <div className="page-actions">
          {canManage && (
            <button className="secondary" onClick={() => setModal("policy")}>
              Configure policy
            </button>
          )}
          {!user.isSuperAdmin && (
            <button
              className="primary"
              onClick={() => setModal("request")}
              disabled={!policies.data?.data.length}
            >
              <Plus size={17} />
              Request time off
            </button>
          )}
        </div>
      </div>
      <div className="stats leave-stats">
        {balances.data?.data.map((b) => (
          <section className="stat" key={b.policy}>
            <div className="stat-top">
              <span>{b.name}</span>
              <CalendarDays size={17} />
            </div>
            <strong>
              {b.available}
              <span className="days-unit"> days</span>
            </strong>
            <small>
              {b.used} used · {b.reserved} pending · {b.year}
            </small>
          </section>
        ))}
      </div>
      {!policies.isPending && !policies.data?.data.length && (
        <div className="info-note">
          <CalendarDays size={19} />
          <span>
            Your HR administrator needs to configure leave policies and annual
            entitlements before requests can be submitted.
          </span>
        </div>
      )}
      <section className="panel">
        <div className="directory-head">
          <div className="tabs">
            {!user.isSuperAdmin && (
              <button
                className={tab === "mine" ? "selected" : ""}
                onClick={() => setTab("mine")}
              >
                My requests
              </button>
            )}
            {canApprove && (
              <button
                className={tab === "team" ? "selected" : ""}
                onClick={() => setTab("team")}
              >
                Team requests & approvals
              </button>
            )}
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
              <CalendarDays size={25} />
            </div>
            <h3>A little balance goes a long way</h3>
            <p>Time-off requests and their outcomes will appear here.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {tab === "team" && <th>EMPLOYEE</th>}
                  <th>LEAVE TYPE</th>
                  <th>DATES</th>
                  <th>DAYS</th>
                  <th>REASON</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((r) => (
                  <tr key={r._id}>
                    {tab === "team" && (
                      <td>
                        {r.employee
                          ? `${r.employee.firstName} ${r.employee.lastName}`
                          : "Archived profile"}
                      </td>
                    )}
                    <td>{r.type}</td>
                    <td>
                      {r.startDate}
                      <small className="cell-sub">to {r.endDate}</small>
                    </td>
                    <td>{r.days}</td>
                    <td className="reason-cell">
                      {r.reason}
                      {r.decisionReason && (
                        <small className="cell-sub">
                          Decision: {r.decisionReason}
                        </small>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${r.status.toLowerCase()}`}>
                        <i />
                        {r.status}
                      </span>
                      {r.cancellationRequested && (
                        <small className="cell-sub">
                          Cancellation awaiting review
                        </small>
                      )}
                    </td>
                    <td>
                      {r.status === "Approved" &&
                        tab === "mine" &&
                        !r.cancellationRequested && (
                          <button
                            className="text-button"
                            onClick={() =>
                              setDecision({
                                id: r._id,
                                action: "request-cancellation",
                              })
                            }
                          >
                            Request cancellation
                          </button>
                        )}
                      {r.status === "Approved" &&
                        r.cancellationRequested &&
                        tab === "team" &&
                        String(r.employee?._id) !== String(user.employee) && (
                          <div className="row-actions">
                            <button
                              className="text-button"
                              onClick={() =>
                                setDecision({
                                  id: r._id,
                                  action: "review-cancellation",
                                  approve: true,
                                })
                              }
                            >
                              Approve cancellation
                            </button>
                            <button
                              className="text-button"
                              onClick={() =>
                                setDecision({
                                  id: r._id,
                                  action: "review-cancellation",
                                  approve: false,
                                })
                              }
                            >
                              Decline cancellation
                            </button>
                          </div>
                        )}
                      {r.status === "Pending" && (
                        <div className="row-actions">
                          {tab === "team" &&
                          String(r.employee?._id) !== String(user.employee) ? (
                            <>
                              <button
                                className="text-button"
                                onClick={() =>
                                  setDecision({ id: r._id, action: "approve" })
                                }
                              >
                                Approve
                              </button>
                              <button
                                className="text-button"
                                onClick={() =>
                                  setDecision({ id: r._id, action: "reject" })
                                }
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <button
                              className="text-button"
                              onClick={() =>
                                setDecision({ id: r._id, action: "cancel" })
                              }
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {modal && (
        <LeaveForm
          mode={modal}
          policies={policies.data?.data || []}
          onClose={() => setModal(null)}
        />
      )}
      {decision && (
        <div className="confirmation-backdrop">
          <section
            className="confirmation"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="leave-confirm-title"
          >
            <h2 id="leave-confirm-title">
              {decision.action === "review-cancellation"
                ? decision.approve
                  ? "Approve cancellation of"
                  : "Decline cancellation of"
                : decision.action.replaceAll("-", " ")}{" "}
              this request?
            </h2>
            <p>The leave ledger and balance will update together.</p>
            {(decision.action === "reject" ||
              decision.action.includes("cancellation")) && (
              <label className="decision-reason">
                Reason
                <textarea
                  minLength={3}
                  maxLength={500}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
            )}
            {mutation.isError && (
              <div className="notice" role="alert">
                {errorMessage(mutation.error)}
              </div>
            )}
            <div className="form-footer">
              <button className="secondary" onClick={() => setDecision(null)}>
                Go back
              </button>
              <button
                className="primary"
                disabled={
                  mutation.isPending ||
                  ((decision.action === "reject" ||
                    decision.action.includes("cancellation")) &&
                    reason.trim().length <
                      (decision.action === "request-cancellation" ? 10 : 3))
                }
                onClick={() => mutation.mutate(decision)}
              >
                <Check size={16} />
                {mutation.isPending ? "Updating…" : "Confirm"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
function LeaveForm({ mode, policies, onClose }) {
  const { register, handleSubmit, watch } = useForm({
    defaultValues: {
      paid: true,
      accrual: "Annual",
      carryForwardLimit: 0,
      minimumNoticeDays: 0,
      probationAllowed: true,
      halfDay: false,
      halfDayPeriod: "Morning",
    },
  });
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input) =>
      api.post(mode === "policy" ? "/leave-policies" : "/leaves", input),
    onSuccess: () => {
      qc.invalidateQueries();
      onClose();
    },
  });
  return (
    <div className="confirmation-backdrop">
      <section
        className="confirmation"
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-form-title"
      >
        <div className="modal-title">
          <h2 id="leave-form-title">
            {mode === "policy" ? "Configure leave policy" : "Request time off"}
          </h2>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit((input) => mutation.mutate(input))}>
          <div className="form-grid">
            {mode === "policy" ? (
              <>
                <label className="full">
                  Policy name
                  <input
                    required
                    maxLength={80}
                    placeholder="e.g. Casual Leave"
                    {...register("name")}
                  />
                </label>
                <label>
                  Annual entitlement (days)
                  <input
                    required
                    min={0}
                    max={366}
                    type="number"
                    {...register("annualDays", { valueAsNumber: true })}
                  />
                </label>
                <label>
                  Weekend counting
                  <select
                    {...register("excludeWeekends", {
                      setValueAs: (v) => v === "true",
                    })}
                  >
                    <option value="true">Exclude Saturday & Sunday</option>
                    <option value="false">Count all calendar days</option>
                  </select>
                </label>
                <label>
                  Accrual
                  <select {...register("accrual")}>
                    <option>Annual</option>
                    <option>Monthly</option>
                  </select>
                </label>
                <label>
                  Maximum carry-forward days
                  <input
                    type="number"
                    min={0}
                    max={366}
                    step={0.5}
                    {...register("carryForwardLimit", { valueAsNumber: true })}
                  />
                </label>
                <label>
                  Minimum notice (days)
                  <input
                    type="number"
                    min={0}
                    max={365}
                    {...register("minimumNoticeDays", { valueAsNumber: true })}
                  />
                </label>
                <label>
                  Paid leave
                  <span className="checkbox-field">
                    <input type="checkbox" {...register("paid")} />
                    Paid entitlement
                  </span>
                </label>
                <label>
                  Half-day requests
                  <span className="checkbox-field">
                    <input type="checkbox" {...register("halfDayAllowed")} />
                    Allowed
                  </span>
                </label>
                <label>
                  Leave encashment
                  <span className="checkbox-field">
                    <input type="checkbox" {...register("encashmentAllowed")} />
                    Allowed
                  </span>
                </label>
                <label>
                  During probation
                  <span className="checkbox-field">
                    <input type="checkbox" {...register("probationAllowed")} />
                    Allowed
                  </span>
                </label>
                <p className="full">
                  Use your approved company policy. Entitlements are snapshotted
                  when an employee first submits a request for that year.
                </p>
              </>
            ) : (
              <>
                <label className="full">
                  Leave type
                  <select {...register("type")}>
                    {policies.map((p) => (
                      <option key={p._id}>{p.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Start date
                  <input type="date" required {...register("startDate")} />
                </label>
                <label>
                  End date
                  <input type="date" required {...register("endDate")} />
                </label>
                <label>
                  Half-day request
                  <span className="checkbox-field">
                    <input type="checkbox" {...register("halfDay")} />
                    Request 0.5 day
                  </span>
                </label>
                {watch("halfDay") && (
                  <label>
                    Half-day period
                    <select {...register("halfDayPeriod")}>
                      <option>Morning</option>
                      <option>Afternoon</option>
                    </select>
                  </label>
                )}
                <label className="full">
                  Reason
                  <textarea
                    required
                    minLength={10}
                    maxLength={1000}
                    {...register("reason")}
                  />
                </label>
              </>
            )}
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
              {mutation.isPending
                ? "Saving…"
                : mode === "policy"
                  ? "Save policy"
                  : "Submit request"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
