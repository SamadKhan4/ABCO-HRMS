import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock3, ArrowRight, Check, Pause, Play } from "lucide-react";
import ResourcePage, {
  can,
  person,
  employeeField,
} from "../components/ResourcePage";
import { api, get, errorMessage } from "../api";

export function PunchCard({ compact = false }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState("Office");
  const options = useQuery({
    queryKey: ["attendance-options"],
    queryFn: () => get("/attendance/options"),
  });
  const query = useQuery({
    queryKey: ["my-attendance"],
    queryFn: () => get("/attendance/me"),
  });
  const records = query.data?.data || [];
  const open = records.find((r) => r.punchIn && !r.punchOut);
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const todayRecord = records.find((r) => r.date === today);
  const record = open || todayRecord;
  const onLeave =
      record?.status === "On Leave" && (record.leaveFraction || 1) >= 1,
    complete = !!record?.punchOut,
    onBreak = open?.breaks?.some((b) => !b.end);
  const mutation = useMutation({
    mutationFn: (action) => api.post("/attendance/" + action, { mode }),
    onSuccess: () => qc.invalidateQueries(),
  });
  return (
    <div className={`punch-card ${compact ? "compact" : ""}`}>
      {query.error ? (
        <div className="notice" role="alert">
          {errorMessage(query.error)}
        </div>
      ) : (
        <>
          <div className="punch-status">
            <span className="clock-circle">
              <Clock3 size={23} />
            </span>
            <div>
              <strong>
                {query.isPending
                  ? "Loading workday…"
                  : onLeave
                    ? "You’re on leave today"
                    : complete
                      ? "Workday complete"
                      : onBreak
                        ? "Taking a break"
                        : open
                          ? "You’re checked in"
                          : "Ready when you are"}
              </strong>
              <small>
                {record?.punchIn
                  ? `Punched in ${new Date(record.punchIn).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}${record.lateMinutes ? ` · ${record.lateMinutes} min late` : ""}`
                  : "Start your day with a quick check-in."}
              </small>
            </div>
          </div>
          <div className="punch-controls">
            {!open &&
              !complete &&
              !onLeave &&
              options.data?.data.modes.length > 1 && (
                <label className="attendance-mode">
                  Work location
                  <select
                    aria-label="Work location"
                    value={mode}
                    onChange={(event) => setMode(event.target.value)}
                  >
                    {options.data.data.modes.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
              )}
            {open && (
              <button
                className="secondary"
                disabled={mutation.isPending}
                onClick={() =>
                  mutation.mutate(onBreak ? "break-end" : "break-start")
                }
              >
                {onBreak ? <Play size={15} /> : <Pause size={15} />}
                {onBreak ? "End break" : "Start break"}
              </button>
            )}
            <button
              className="primary"
              disabled={
                query.isPending ||
                mutation.isPending ||
                onLeave ||
                complete ||
                onBreak
              }
              onClick={() => mutation.mutate(open ? "punch-out" : "punch-in")}
            >
              {mutation.isPending ? (
                "Recording…"
              ) : complete ? (
                <>
                  <Check size={16} />
                  All done for today
                </>
              ) : onLeave ? (
                "On leave"
              ) : open ? (
                "Punch out"
              ) : (
                "Punch in"
              )}
              {!complete && !onLeave && <ArrowRight size={16} />}
            </button>
          </div>
        </>
      )}
      {mutation.isError && (
        <div className="notice" role="alert">
          {errorMessage(mutation.error)}
        </div>
      )}
    </div>
  );
}
export default function AttendanceWorkspace({ user }) {
  const [tab, setTab] = useState("attendance"),
    [date, setDate] = useState("");
  const broad = can(user, "attendance.read");
  const shifts = useQuery({
    queryKey: ["organization-lookups"],
    queryFn: () => get("/organization-lookups"),
    enabled: can(user, "attendance.manage"),
  });
  const attendance = {
    title: "Attendance",
    description:
      "Every workday, accurately recorded. Breaks, shifts and hours in one place.",
    endpoint: broad
      ? `/attendance${date ? "?date=" + date : ""}`
      : "/attendance/me",
    columns: [
      ...(broad
        ? [{ label: "Employee", render: (r) => person(r.employee) }]
        : []),
      { label: "Date", key: "date" },
      {
        label: "In",
        render: (r) =>
          r.punchIn
            ? new Date(r.punchIn).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "—",
      },
      {
        label: "Out",
        render: (r) =>
          r.punchOut
            ? new Date(r.punchOut).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "—",
      },
      {
        label: "Work time",
        render: (r) =>
          r.punchOut
            ? `${Math.floor(r.workingMinutes / 60)}h ${r.workingMinutes % 60}m`
            : r.status === "On Leave"
              ? "—"
              : "In progress",
      },
      { label: "Late", render: (r) => `${r.lateMinutes || 0} min` },
      {
        label: "Status",
        render: (r) =>
          r.status === "On Leave" ? "On Leave" : r.attendanceClass || r.status,
      },
    ],
  };
  const correction = {
    title: "Attendance corrections",
    description:
      "Request accurate times while preserving the original history.",
    endpoint: "/attendance/regularizations",
    create: user.isSuperAdmin ? undefined : "Request a correction",
    fields: [
      { name: "date", label: "Workday", type: "date" },
      {
        name: "requestedIn",
        label: "Requested punch-in",
        type: "datetime-local",
      },
      {
        name: "requestedOut",
        label: "Requested punch-out",
        type: "datetime-local",
      },
      { name: "reason", label: "Reason", type: "textarea", full: true },
    ],
    prepare: (input) => ({
      ...input,
      requestedIn: new Date(input.requestedIn).toISOString(),
      requestedOut: new Date(input.requestedOut).toISOString(),
    }),
    columns: [
      { label: "Employee", render: (r) => person(r.employee) },
      { label: "Date", key: "date" },
      { label: "Reason", key: "reason", wrap: true },
      { label: "Status", key: "status", status: true },
    ],
    actions: ["approve", "reject"].map((action) => ({
      label: action === "approve" ? "Approve correction" : "Reject correction",
      endpoint: action,
      permission: "attendance.regularize",
      when: (r, u) =>
        r.status === "Pending" &&
        String(r.employee?._id || r.employee) !== String(u.employee),
      fields: [{ name: "reason", label: "Decision reason", type: "textarea" }],
    })),
  };
  const assignment = {
    title: "Shift assignments",
    description:
      "Effective-dated schedules preserve the attendance rules used on each workday.",
    endpoint: "/shift-assignments",
    create: "Assign shift",
    permission: "attendance.manage",
    fields: [
      employeeField,
      {
        name: "shift",
        label: "Shift",
        type: "select",
        options: (shifts.data?.data || [])
          .filter((r) => r.kind === "shifts")
          .map((r) => ({ value: r._id, label: r.name })),
      },
      { name: "effectiveFrom", label: "Effective from", type: "date" },
      { name: "timezone", label: "Branch timezone" },
      {
        name: "fullDayMinutes",
        label: "Full day threshold (minutes)",
        type: "number",
        min: 60,
        max: 1440,
      },
      {
        name: "halfDayMinutes",
        label: "Half day threshold (minutes)",
        type: "number",
        min: 1,
        max: 1440,
      },
      {
        name: "weeklyOffDays",
        label: "Weekly off policy",
        type: "select",
        options: [
          { value: "0,6", label: "Saturday & Sunday" },
          { value: "0", label: "Sunday" },
          { value: "5,6", label: "Friday & Saturday" },
        ],
      },
    ],
    initial: {
      effectiveFrom: new Date().toISOString().slice(0, 10),
      timezone: "Asia/Kolkata",
      fullDayMinutes: 480,
      halfDayMinutes: 240,
      weeklyOffDays: "0,6",
    },
    prepare: (input) => ({
      ...input,
      weeklyOffDays: input.weeklyOffDays.split(",").map(Number),
    }),
    columns: [
      { label: "Employee", render: (r) => person(r.employee) },
      { label: "Shift", render: (r) => r.shift?.name },
      { label: "Effective from", key: "effectiveFrom" },
      { label: "Schedule", render: (r) => `${r.startTime} – ${r.endTime}` },
      { label: "Timezone", key: "timezone" },
    ],
  };
  return (
    <>
      <div className="module-tabs">
        <button
          className={tab === "attendance" ? "active" : ""}
          onClick={() => setTab("attendance")}
        >
          Attendance
        </button>
        <button
          className={tab === "corrections" ? "active" : ""}
          onClick={() => setTab("corrections")}
        >
          Corrections
        </button>
        {can(user, "attendance.manage") && (
          <button
            className={tab === "shifts" ? "active" : ""}
            onClick={() => setTab("shifts")}
          >
            Shift assignments
          </button>
        )}
      </div>
      {tab === "attendance" && (
        <>
          {!user.isSuperAdmin && (
            <section className="panel attendance-punch">
              <PunchCard />
            </section>
          )}
          {broad && (
            <div className="attendance-date">
              <label>
                Workday
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
            </div>
          )}
        </>
      )}
      <ResourcePage
        key={tab}
        config={
          tab === "corrections"
            ? correction
            : tab === "shifts"
              ? assignment
              : attendance
        }
        user={user}
      />
    </>
  );
}
