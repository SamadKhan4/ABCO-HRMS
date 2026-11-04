import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ResourceForm, download } from "./ResourcePage";
import { api, get, errorMessage } from "../api";
export default function Attachments({ context, record }) {
  const [uploading, setUploading] = useState(false),
    [error, setError] = useState(null);
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["attachments", context, record._id],
    queryFn: () => get(`/${context}/${record._id}/attachments`),
  });
  async function fetchFile(document) {
    try {
      setError(null);
      const access = (await api.post(`/documents/${document._id}/access`, {}))
        .data.data;
      const mime = document.versions.at(-1)?.mime,
        extension =
          mime === "application/pdf"
            ? "pdf"
            : mime === "image/png"
              ? "png"
              : "jpg";
      await download(
        access.url.replace("/api/v1", ""),
        document.name + "." + extension,
      );
    } catch (error) {
      setError(error);
    }
  }
  return (
    <section className="attachment-panel">
      <div className="panel-title">
        <h2>Attachments</h2>
        <button className="secondary" onClick={() => setUploading(true)}>
          Attach a file
        </button>
      </div>
      {query.error && <div className="notice">{errorMessage(query.error)}</div>}
      {error && <div className="notice">{errorMessage(error)}</div>}
      {query.data?.data.length ? (
        query.data.data.map((document) => (
          <div className="attachment-row" key={document._id}>
            <strong>{document.name}</strong>
            <button className="text-button" onClick={() => fetchFile(document)}>
              Download
            </button>
          </div>
        ))
      ) : (
        <p>No attachments yet.</p>
      )}
      {uploading && (
        <ResourceForm
          title="Attach a file"
          fields={[
            { name: "name", label: "Attachment name" },
            {
              name: "file",
              label: "PDF, PNG or JPEG (max 8 MB)",
              type: "file",
              accept: ".pdf,.png,.jpg,.jpeg",
            },
          ]}
          onClose={() => setUploading(false)}
          onSubmit={async (input) => {
            const form = new FormData();
            form.append("name", input.name);
            form.append("file", input.file[0]);
            await api.post(`/${context}/${record._id}/attachments`, form);
            await qc.invalidateQueries({
              queryKey: ["attachments", context, record._id],
            });
          }}
        />
      )}
    </section>
  );
}
