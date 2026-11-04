import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { api, get, errorMessage } from "../api";
export default function NotificationPreferences() {
  const query = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: () => get("/notification-preferences"),
  });
  if (query.isPending) return null;
  if (query.error)
    return <div className="notice">{errorMessage(query.error)}</div>;
  return <PreferenceForm initial={query.data.data} />;
}
function PreferenceForm({ initial }) {
  const { register, handleSubmit } = useForm({ defaultValues: initial });
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input) =>
      api.patch("/notification-preferences", {
        inApp: input.inApp,
        email: input.email,
      }),
    onSuccess: () => qc.invalidateQueries(),
  });
  return (
    <section className="panel settings-panel preferences-panel">
      <h2>Notification preferences</h2>
      <form onSubmit={handleSubmit((input) => mutation.mutate(input))}>
        <label className="checkbox-field">
          <input type="checkbox" {...register("inApp")} />
          In-app updates
        </label>
        <label className="checkbox-field">
          <input
            type="checkbox"
            disabled={!initial.emailAvailable}
            {...register("email")}
          />
          Email updates
        </label>
        {!initial.emailAvailable && (
          <p>Email delivery requires administrator SMTP configuration.</p>
        )}
        {mutation.isError && (
          <div className="notice">{errorMessage(mutation.error)}</div>
        )}
        {mutation.isSuccess && (
          <div className="success-note">Notification preferences saved.</div>
        )}
        <div className="form-footer">
          <button className="primary" disabled={mutation.isPending}>
            Save preferences
          </button>
        </div>
      </form>
    </section>
  );
}
