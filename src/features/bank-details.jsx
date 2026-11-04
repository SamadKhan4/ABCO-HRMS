import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { api, get, errorMessage } from "../api";
export default function BankDetails() {
  const query = useQuery({
    queryKey: ["my-bank-details"],
    queryFn: () => get("/employees/me/bank-details"),
  });
  const { register, handleSubmit, reset } = useForm();
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (input) => {
      await api.post("/auth/reauthenticate", { password: input.password });
      return api.put("/employees/me/bank-details", {
        holder: input.holder,
        bankName: input.bankName,
        accountNumber: input.accountNumber,
        routingCode: input.routingCode,
      });
    },
    onSuccess: () => {
      reset();
      qc.invalidateQueries({ queryKey: ["my-bank-details"] });
    },
  });
  return (
    <section className="panel settings-panel bank-panel">
      <h2>Payment details</h2>
      <p>
        Your account identifier is encrypted. Only its last four characters
        appear in ordinary views.
      </p>
      {query.data?.data && (
        <div className="info-note">
          {query.data.data.bankName} · {query.data.data.maskedAccount}
        </div>
      )}
      <form onSubmit={handleSubmit((input) => mutation.mutate(input))}>
        <div className="form-grid">
          <label>
            Account holder
            <input
              required
              maxLength={100}
              autoComplete="off"
              {...register("holder")}
            />
          </label>
          <label>
            Bank name
            <input
              required
              maxLength={100}
              autoComplete="off"
              {...register("bankName")}
            />
          </label>
          <label>
            Account number / identifier
            <input
              required
              minLength={5}
              maxLength={34}
              autoComplete="off"
              {...register("accountNumber")}
            />
          </label>
          <label>
            IFSC / routing code
            <input
              required
              minLength={3}
              maxLength={30}
              autoComplete="off"
              {...register("routingCode")}
            />
          </label>
          <label className="full">
            Confirm your current password
            <input
              type="password"
              autoComplete="current-password"
              required
              {...register("password")}
            />
          </label>
        </div>
        {mutation.isError && (
          <div className="notice" role="alert">
            {errorMessage(mutation.error)}
          </div>
        )}
        {mutation.isSuccess && (
          <div className="success-note">Payment details saved securely.</div>
        )}
        <div className="form-footer">
          <button className="primary" disabled={mutation.isPending}>
            Save payment details
          </button>
        </div>
      </form>
    </section>
  );
}
