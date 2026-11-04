import React from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { api, errorMessage } from "./api";
export default function Activation() {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();
  const token = new URLSearchParams(location.search).get("token");
  const mutation = useMutation({
    mutationFn: ({ password }) =>
      api.post("/auth/activate", { token, password }),
  });
  return (
    <div className="activation-page">
      <section className="activation-card">
        <span className="activation-icon">
          <ShieldCheck size={28} />
        </span>
        <span className="eyebrow">WELCOME TO ABCO COMPUTERS</span>
        <h1>
          {mutation.isSuccess
            ? "You’re all set."
            : "Your next chapter starts here."}
        </h1>
        <p>
          {mutation.isSuccess
            ? "Your account is active. Sign in to meet your workspace."
            : "Create a password to activate your employee account."}
        </p>
        {mutation.isSuccess ? (
          <Link className="primary" to="/">
            Go to sign in
            <ArrowRight size={16} />
          </Link>
        ) : (
          <form onSubmit={handleSubmit((values) => mutation.mutate(values))}>
            <label>
              Choose a password
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={128}
                {...register("password", { required: true, minLength: 12 })}
              />
            </label>
            <label>
              Confirm password
              <input
                type="password"
                autoComplete="new-password"
                required
                {...register("confirm", {
                  validate: (value) =>
                    value === watch("password") || "Passwords must match",
                })}
              />
            </label>
            {errors.confirm && (
              <span className="field-error">{errors.confirm.message}</span>
            )}
            {mutation.isError && (
              <div className="notice" role="alert">
                {errorMessage(mutation.error)}
              </div>
            )}
            <button className="primary" disabled={mutation.isPending || !token}>
              {mutation.isPending ? "Activating…" : "Activate my account"}
              <ArrowRight size={16} />
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
export function InviteEmployee({ employee }) {
  const invite = useMutation({
    mutationFn: () => api.post(`/employees/${employee._id}/invite`),
  });
  return (
    <section className="invite-section">
      <strong>Workspace access</strong>
      <p>
        Create a one-time activation link and share it privately with this
        employee. The link expires in 24 hours.
      </p>
      {invite.isSuccess ? (
        <>
          <label>
            Activation link
            <input
              readOnly
              aria-label="Activation link"
              value={`${location.origin}${invite.data.data.data.activationPath}`}
              onFocus={(e) => e.target.select()}
            />
          </label>
          <small>
            Automatic email delivery is not configured. Share this link using
            your approved private channel.
          </small>
        </>
      ) : (
        <button
          className="secondary"
          disabled={invite.isPending || employee.status === "Archived"}
          onClick={() => invite.mutate()}
        >
          {invite.isPending ? "Creating link…" : "Create activation link"}
        </button>
      )}
      {invite.isError && (
        <div className="notice" role="alert">
          {errorMessage(invite.error)}
        </div>
      )}
    </section>
  );
}
