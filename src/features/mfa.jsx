import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, get, errorMessage } from "../api";
export default function MFA() {
  const query = useQuery({
    queryKey: ["mfa-status"],
    queryFn: () => get("/auth/mfa"),
  });
  const [code, setCode] = useState(""),
    [password, setPassword] = useState(""),
    [setup, setSetup] = useState(null),
    [recoveryCodes, setRecoveryCodes] = useState(null);
  const qc = useQueryClient();
  const authorize = useMutation({
    mutationFn: () => api.post("/auth/reauthenticate", { password }),
    onSuccess: () => setPassword(""),
  });
  const begin = useMutation({
    mutationFn: () => api.post("/auth/mfa/setup"),
    onSuccess: (response) => {
      setSetup(response.data.data);
      setRecoveryCodes(null);
    },
  });
  const enable = useMutation({
    mutationFn: () => api.post("/auth/mfa/enable", { code }),
    onSuccess: (response) => {
      setRecoveryCodes(response.data.data.recoveryCodes);
      setSetup(null);
      setCode("");
      qc.invalidateQueries();
    },
  });
  const disable = useMutation({
    mutationFn: () => api.post("/auth/mfa/disable", { code }),
    onSuccess: () => {
      setCode("");
      setRecoveryCodes(null);
      qc.invalidateQueries();
    },
  });
  return (
    <section className="panel settings-panel mfa-panel">
      <h2>Two-factor authentication</h2>
      <p>Add a time-based authenticator code to protect your account.</p>
      {query.error && <div className="notice">{errorMessage(query.error)}</div>}
      <div className="mfa-status">
        <span className="badge">
          {query.data?.data.enabled ? "Enabled" : "Not enabled"}
        </span>
        {query.data?.data.enabled && (
          <small>
            {query.data.data.recoveryCodesRemaining} recovery codes remaining
          </small>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          authorize.mutate();
        }}
      >
        <label>
          Confirm your current password
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button className="secondary" disabled={authorize.isPending}>
          Confirm identity
        </button>
        {authorize.isSuccess && (
          <div className="success-note">Identity confirmed for 5 minutes.</div>
        )}
      </form>
      {authorize.isError && (
        <div className="notice">{errorMessage(authorize.error)}</div>
      )}
      {!query.data?.data.enabled && !setup && (
        <button
          className="primary mfa-start"
          disabled={begin.isPending}
          onClick={() => begin.mutate()}
        >
          Set up authenticator
        </button>
      )}
      {setup && (
        <div className="mfa-setup">
          <img
            width="240"
            height="240"
            src={setup.qr}
            alt="Authenticator setup QR code"
          />
          <p>
            Scan this QR code with your authenticator. You can also enter this
            setup key manually:
          </p>
          <code>{setup.secret}</code>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              enable.mutate();
            }}
          >
            <label>
              Six-digit authenticator code
              <input
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </label>
            <button className="primary" disabled={enable.isPending}>
              Enable two-factor authentication
            </button>
          </form>
        </div>
      )}
      {query.data?.data.enabled && !recoveryCodes && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            disable.mutate();
          }}
        >
          <label>
            Fresh authenticator or recovery code
            <input
              required
              value={code}
              autoComplete="one-time-code"
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
          <button className="secondary" disabled={disable.isPending}>
            Disable two-factor authentication
          </button>
        </form>
      )}
      {recoveryCodes && (
        <div className="mfa-recovery">
          <h3>Save these recovery codes privately</h3>
          <p>Each code can be used once. They will not be shown again.</p>
          <div>
            {recoveryCodes.map((value) => (
              <code key={value}>{value}</code>
            ))}
          </div>
          <button className="secondary" onClick={() => setRecoveryCodes(null)}>
            I have saved my recovery codes
          </button>
        </div>
      )}
      {[begin, enable, disable]
        .filter((mutation) => mutation.isError)
        .map((mutation, index) => (
          <div className="notice" role="alert" key={index}>
            {errorMessage(mutation.error)}
          </div>
        ))}
    </section>
  );
}
