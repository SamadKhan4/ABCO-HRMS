import React from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { api, errorMessage } from "./api";
export default function Setup() {
  const token = location.hash.slice(1);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();
  const mutation = useMutation({
    mutationFn: ({ name, email, password }) =>
      api.post("/auth/setup", { token, name, email, password }),
  });
  return (
    <div className="activation-page">
      <section className="activation-card">
        <span className="activation-icon">
          <ShieldCheck size={28} />
        </span>
        <span className="eyebrow">ABCO HRMS · FIRST-TIME SETUP</span>
        <h1>
          {mutation.isSuccess
            ? "Your workspace is ready."
            : "Make it your workspace."}
        </h1>
        <p>
          {mutation.isSuccess
            ? "Your Super Admin account has been created. This setup link can no longer be used."
            : "Create the initial Super Admin account. Choose your own secure credentials."}
        </p>
        {mutation.isSuccess ? (
          <Link className="primary" to="/">
            Continue to sign in
            <ArrowRight size={16} />
          </Link>
        ) : (
          <form onSubmit={handleSubmit((values) => mutation.mutate(values))}>
            <label>
              Your name
              <input
                autoComplete="name"
                required
                maxLength={80}
                {...register("name")}
              />
            </label>
            <label>
              Work email
              <input
                type="email"
                autoComplete="username"
                required
                {...register("email")}
              />
            </label>
            <label>
              Password
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
              <span className="field-error">{errors.confirm.message}</span>
            )}
            {mutation.isError && (
              <div className="notice" role="alert">
                {errorMessage(mutation.error)}
              </div>
            )}
            <button className="primary" disabled={mutation.isPending || !token}>
              {mutation.isPending
                ? "Creating workspace…"
                : "Create my workspace"}
              <ArrowRight size={16} />
            </button>
            {!token && (
              <p className="field-error">
                Run npm run setup in the project terminal to generate a secure
                setup link.
              </p>
            )}
          </form>
        )}
      </section>
    </div>
  );
}
