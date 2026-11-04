import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { api, get, errorMessage } from "../api";
export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate(),
    qc = useQueryClient();
  const query = useQuery({
    queryKey: ["notification-center"],
    queryFn: () => get("/notifications?limit=8"),
    refetchInterval: 30000,
  });
  const mutation = useMutation({
    mutationFn: (record) => api.post(`/notifications/${record._id}/read`),
    onSuccess: (_result, record) => {
      qc.invalidateQueries({ queryKey: ["notification-center"] });
      setOpen(false);
      if (record.path?.startsWith("/") && !record.path.startsWith("//"))
        navigate(record.path);
    },
  });
  return (
    <div className="notification-wrap">
      <button
        className="icon-button bell"
        aria-label={`Notifications, ${query.data?.unread || 0} unread`}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Bell size={19} />
        {query.data?.unread > 0 && (
          <span className="notification-count">
            {query.data.unread > 99 ? "99+" : query.data.unread}
          </span>
        )}
      </button>
      {open && (
        <div className="notification-panel">
          <div className="notification-heading">
            <strong>Notifications</strong>
            <button
              className="text-button"
              onClick={() => {
                setOpen(false);
                navigate("/notifications");
              }}
            >
              View all
            </button>
          </div>
          {query.error ? (
            <p role="alert">{errorMessage(query.error)}</p>
          ) : query.isPending ? (
            <p>Loading updates…</p>
          ) : !query.data.data.length ? (
            <p>You’re all caught up.</p>
          ) : (
            query.data.data.map((record) => (
              <button
                key={record._id}
                className={`notification-item ${record.readAt ? "read" : "unread"}`}
                onClick={() => mutation.mutate(record)}
                disabled={mutation.isPending}
              >
                <strong>{record.title}</strong>
                <span>{record.body}</span>
                <small>
                  {new Date(record.createdAt).toLocaleString("en-IN")}
                </small>
              </button>
            ))
          )}
          {mutation.isError && (
            <p role="alert">{errorMessage(mutation.error)}</p>
          )}
        </div>
      )}
    </div>
  );
}
