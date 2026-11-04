import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { get, errorMessage } from "../api";
export default function Calendar() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)),
    [kind, setKind] = useState("Attendance"),
    [selected, setSelected] = useState(null);
  const query = useQuery({
    queryKey: ["calendar", month, kind],
    queryFn: () => get(`/calendar?month=${month}&kind=${kind}`),
  });
  const [year, index] = month.split("-").map(Number),
    first = new Date(Date.UTC(year, index - 1, 1)),
    days = new Date(Date.UTC(year, index, 0)).getUTCDate(),
    offset = (first.getUTCDay() + 6) % 7;
  const cells = Array.from({ length: offset + days }, (_, cell) =>
    cell < offset ? null : cell - offset + 1,
  );
  function move(direction) {
    const next = new Date(Date.UTC(year, index - 1 + direction, 1));
    setMonth(next.toISOString().slice(0, 7));
    setSelected(null);
  }
  const events = query.data?.data.events || [];
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">PLAN WITH A CLEARER PICTURE</span>
          <h1>Team calendar</h1>
          <p>
            Authorized workdays, time off, holidays, shifts and learning plans.
          </p>
        </div>
      </div>
      <section className="panel calendar-panel">
        <div className="calendar-toolbar">
          <label className="sr-only" htmlFor="calendar-kind">
            Calendar type
          </label>
          <select
            id="calendar-kind"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              setSelected(null);
            }}
          >
            {[
              "Attendance",
              "Leave",
              "Holidays",
              "Shifts",
              "Training",
              "Travel",
            ].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <div>
            <button
              className="icon-button"
              aria-label="Previous month"
              onClick={() => move(-1)}
            >
              <ChevronLeft size={18} />
            </button>
            <label className="sr-only" htmlFor="calendar-month">
              Month
            </label>
            <input
              id="calendar-month"
              type="month"
              value={month}
              onChange={(e) => {
                setMonth(e.target.value);
                setSelected(null);
              }}
            />
            <button
              className="icon-button"
              aria-label="Next month"
              onClick={() => move(1)}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        {query.error && (
          <div className="notice" role="alert">
            {errorMessage(query.error)}
          </div>
        )}
        {query.isPending && (
          <p className="calendar-loading" role="status">
            Loading calendar…
          </p>
        )}
        <div className="calendar-grid">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div className="calendar-weekday" key={day}>
              {day}
            </div>
          ))}
          {cells.map((day, cell) => {
            const date = day
                ? `${month}-${String(day).padStart(2, "0")}`
                : null,
              items = date ? events.filter((event) => event.date === date) : [];
            return day ? (
              <button
                className={`calendar-day ${selected === date ? "selected" : ""}`}
                key={date}
                onClick={() => setSelected(date)}
                aria-label={`${date}, ${items.length} events`}
              >
                <strong>{day}</strong>
                {items.slice(0, 2).map((event, i) => (
                  <span className="calendar-event" key={i}>
                    {event.title}
                  </span>
                ))}
                {items.length > 2 && <small>+{items.length - 2} more</small>}
              </button>
            ) : (
              <div className="calendar-day blank" key={`blank-${cell}`} />
            );
          })}
        </div>
        {selected && (
          <div className="calendar-details">
            <h2>{selected}</h2>
            {events.filter((event) => event.date === selected).length ? (
              events
                .filter((event) => event.date === selected)
                .map((event, index) => (
                  <div key={index}>
                    <span className="badge">{event.type}</span>
                    <strong>{event.title}</strong>
                  </div>
                ))
            ) : (
              <p>No records for this date in your authorized calendar.</p>
            )}
          </div>
        )}
      </section>
    </>
  );
}
