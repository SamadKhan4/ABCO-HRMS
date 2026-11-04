import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, download } from "../components/ResourcePage";
import { api, errorMessage } from "../api";
export default function EmployeeImport({ onClose }) {
  const [file, setFile] = useState(null),
    [preview, setPreview] = useState(null);
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (commit) => {
      const form = new FormData();
      form.append("file", file);
      return api.post(
        "/employees/import" + (commit ? "" : "?preview=true"),
        form,
      );
    },
    onSuccess: (result, commit) => {
      if (commit) {
        qc.invalidateQueries();
        onClose();
      } else setPreview(result.data.data);
    },
  });
  return (
    <Dialog title="Import employees" onClose={onClose}>
      <p>
        Use the CSV template to import up to 1,000 employees. Validation runs
        before any employee is created.
      </p>
      <button
        className="secondary import-template"
        onClick={() =>
          download(
            "/employees/import-template",
            "ABCO-employee-import-template.csv",
          )
        }
      >
        Download CSV template
      </button>
      <label>
        UTF-8 CSV file
        <input
          type="file"
          accept=".csv,text/csv"
          required
          onChange={(e) => {
            setFile(e.target.files[0]);
            setPreview(null);
          }}
        />
      </label>
      {mutation.isError && (
        <>
          <div className="notice" role="alert">
            {errorMessage(mutation.error)}
          </div>
          {mutation.error.response?.data?.error?.details && (
            <div className="import-errors">
              {mutation.error.response.data.error.details.map(
                (error, index) => (
                  <p key={index}>
                    {error.row ? `Row ${error.row}` : error.email}:{" "}
                    {error.issues.join("; ")}
                  </p>
                ),
              )}
            </div>
          )}
        </>
      )}
      {preview && (
        <div className="success-note">
          {preview.rows} valid records. Ready to import.
        </div>
      )}
      <div className="form-footer">
        <button className="secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          className="primary"
          disabled={!file || mutation.isPending}
          onClick={() => mutation.mutate(!!preview)}
        >
          {mutation.isPending
            ? "Processing…"
            : preview
              ? "Import employees"
              : "Validate file"}
        </button>
      </div>
    </Dialog>
  );
}
