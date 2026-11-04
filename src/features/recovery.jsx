import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { api, errorMessage, setCsrf } from "../api";
export default function Recovery({ reset = false }) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();
  const mutation = useMutation({
    mutationFn: (values) =>
      api.post(
        reset ? "/auth/reset-password" : "/auth/forgot-password",
        reset
          ? { password: values.password, token: location.hash.slice(1) }
          : { email: values.email },
      ),
    onSuccess: () => {
      if (reset) setCsrf(null);
    },
  });
  return (
    <div className="activation-page">
      <section className="activation-card">
        <span className="activation-icon">
          <ShieldCheck size={28} />
        </span>
        <span className="eyebrow">ABCO HRMS · ACCOUNT RECOVERY</span>
        <h1>{reset ? "A fresh start." : "Forgot your password?"}</h1>
        <p>
          {mutation.isSuccess
            ? reset
              ? "Your password has been changed. Please sign in again."
              : mutation.data.data.data.message
            : reset
              ? "Choose a new password with at least 12 characters."
              : "Enter your work email to request a secure reset link."}
        </p>
        {!mutation.isSuccess && (
          <form onSubmit={handleSubmit((values) => mutation.mutate(values))}>
            {reset ? (
              <>
                <label>
                  New password
                  <input
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={12}
                    maxLength={128}
                    {...register("password")}
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
                  <div className="field-error">{errors.confirm.message}</div>
                )}
              </>
            ) : (
              <label>
                Work email
                <input
                  type="email"
                  autoComplete="username"
                  required
                  {...register("email")}
                />
              </label>
            )}
            {mutation.isError && (
              <div className="notice" role="alert">
                {errorMessage(mutation.error)}
              </div>
            )}
            <button className="primary" disabled={mutation.isPending}>
              {mutation.isPending
                ? "Please wait…"
                : reset
                  ? "Set new password"
                  : "Request reset email"}
            </button>
          </form>
        )}
        <Link className="text-button recovery-back" to="/">
          Back to sign in
        </Link>
      </section>
    </div>
  );
}
