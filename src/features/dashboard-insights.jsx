import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { CalendarDays, Gift, FileText } from "lucide-react";
import { get, errorMessage } from "../api";
import { currency } from "../components/ResourcePage";
export default function DashboardInsights() {
  const query = useQuery({
    queryKey: ["dashboard-insights"],
    queryFn: () => get("/dashboard-insights"),
  });
  if (query.isPending) return null;
  if (query.error)
    return (
      <div className="notice" role="alert">
        {errorMessage(query.error)}
      </div>
    );
  const data = query.data.data;
  return (
    <>
      <div className="section-top">
        <h2>Workforce pulse</h2>
        <span>Connected attendance & leave data</span>
      </div>
      <div className="pulse-stats">
        {[
          ["On leave", data.onLeave],
          ["Late arrivals", data.late],
          ["Scheduled today", data.scheduled],
          ["Not yet checked in", data.absent],
          ["Open workdays", data.missingPunch],
        ].map(([label, value]) => (
          <section className="panel pulse-stat" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </section>
        ))}
      </div>
      {data.unconfigured > 0 && (
        <p className="dashboard-policy-note">
          {data.unconfigured} employee schedule
          {data.unconfigured === 1 ? " is" : "s are"} not configured.
          Unscheduled employees are excluded from absence counts.
        </p>
      )}
      <div className="dashboard-grid insights-grid">
        <section className="panel">
          <div className="panel-title">
            <div>
              <h2>Attendance over the week</h2>
              <p>Recorded check-ins, approved leave and punctuality.</p>
            </div>
          </div>
          <div className="attendance-chart">
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart
                data={data.trend}
                margin={{ top: 10, right: 25, bottom: 10, left: 0 }}
              >
                <CartesianGrid stroke="#edf0f5" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) =>
                    new Date(date + "T12:00Z").toLocaleDateString("en-IN", {
                      weekday: "short",
                    })
                  }
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="present"
                  name="Present"
                  stroke="#173b68"
                  fill="#eaf1f8"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="onLeave"
                  name="On leave"
                  stroke="#80a8c8"
                  fill="#f0f5fa"
                  strokeWidth={1.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="panel">
          <div className="panel-title">
            <div>
              <h2>Upcoming holidays</h2>
              <p>A little time to pause and celebrate.</p>
            </div>
            <CalendarDays size={18} />
          </div>
          <div className="insight-events">
            {data.holidays.length ? (
              data.holidays.map((holiday) => (
                <div key={holiday._id}>
                  <span className="event-date">
                    {new Date(holiday.date + "T12:00Z").toLocaleDateString(
                      "en-IN",
                      { day: "numeric", month: "short" },
                    )}
                  </span>
                  <div>
                    <strong>{holiday.name}</strong>
                    <small>
                      {holiday.branch || "All branches"}
                      {holiday.optional ? " · Optional" : ""}
                    </small>
                  </div>
                </div>
              ))
            ) : (
              <p>No holidays scheduled in the coming week.</p>
            )}
          </div>
        </section>
        <section className="panel">
          <div className="panel-title">
            <div>
              <h2>People moments</h2>
              <p>Birthdays and work anniversaries this week.</p>
            </div>
            <Gift size={18} />
          </div>
          <div className="insight-events">
            {data.celebrations.length ? (
              data.celebrations.map((event, index) => (
                <div key={index}>
                  <span className="event-date">
                    {new Date(event.date + "T12:00Z").toLocaleDateString(
                      "en-IN",
                      { day: "numeric", month: "short" },
                    )}
                  </span>
                  <div>
                    <strong>{event.name}</strong>
                    <small>{event.kind}</small>
                  </div>
                </div>
              ))
            ) : (
              <p>No upcoming celebrations in the current records.</p>
            )}
          </div>
        </section>
        <section className="panel">
          <div className="panel-title">
            <div>
              <h2>Document reminders</h2>
              <p>Authorized documents expiring in the next 30 days.</p>
            </div>
            <FileText size={18} />
          </div>
          <div className="insight-events">
            {data.expiringDocuments.length ? (
              data.expiringDocuments.map((document) => (
                <div key={document._id}>
                  <span className="event-date">{document.expiresAt}</span>
                  <strong>{document.name}</strong>
                </div>
              ))
            ) : (
              <p>No upcoming expiries in your authorized records.</p>
            )}
          </div>
        </section>
        {data.payroll && (
          <section className="panel payroll-summary-panel">
            <div className="panel-title">
              <div>
                <h2>Payroll summary</h2>
                <p>
                  Released payroll only. Visible to authorized finance users.
                </p>
              </div>
            </div>
            {data.payroll.length ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>PERIOD</th>
                      <th>EMPLOYEES</th>
                      <th>GROSS</th>
                      <th>DEDUCTIONS</th>
                      <th>NET</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.payroll.map((period) => (
                      <tr key={period.month}>
                        <td>{period.month}</td>
                        <td>{period.employees}</td>
                        <td>{currency(period.gross)}</td>
                        <td>{currency(period.deductions)}</td>
                        <td>{currency(period.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="insight-events">
                <p>No released payroll periods yet.</p>
              </div>
            )}
          </section>
        )}
      </div>
    </>
  );
}
