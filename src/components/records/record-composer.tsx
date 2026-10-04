"use client";

import { useCallback, useEffect, useState } from "react";
import { X, Trash2 } from "lucide-react";
import { RECORD_SCHEMAS, type RecordField, type RecordKind, type WorkspaceRecord } from "@/lib/record-schemas";
import type { MetricValue, RecordDraft } from "@/components/records/use-records";

function initialValues(kind: RecordKind, record?: WorkspaceRecord | null): RecordDraft {
  const draft: RecordDraft = { kind, title: "", metrics: {} };
  for (const field of RECORD_SCHEMAS[kind].fields) {
    const source = record ? (field.column ? record[field.column] : record.metrics[field.metric!.key]) : undefined;
    if (field.type === "toggle") {
      if (field.column === "starred") draft.starred = record ? record.starred : false;
      else draft.metrics![field.metric!.key] = Boolean(source);
      continue;
    }
    const text = source === undefined || source === null ? "" : String(source);
    if (field.column === "title") draft.title = text;
    else if (field.column) (draft as Record<string, unknown>)[field.column] = text;
    else draft.metrics![field.metric!.key] = field.type === "number" ? (text === "" ? "" : Number(text)) : text;
  }
  return draft;
}

type FieldProps = { field: RecordField; value: MetricValue | string | undefined; onChange: (value: MetricValue) => void };

function Field({ field, value, onChange }: FieldProps) {
  if (field.type === "toggle") {
    return (
      <label className="record-toggle">
        <input type="checkbox" checked={Boolean(value)} onChange={event => onChange(event.target.checked)}/>
        <span>{field.label}</span>
      </label>
    );
  }
  if (field.type === "select") {
    return (
      <label className="record-field">
        <span>{field.label}</span>
        <select value={String(value ?? "")} onChange={event => onChange(event.target.value)}>
          <option value="">Not set</option>
          {field.options?.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
    );
  }
  if (field.type === "textarea") {
    return (
      <label className="record-field record-field-wide">
        <span>{field.label}</span>
        <textarea rows={3} value={String(value ?? "")} placeholder={field.placeholder} onChange={event => onChange(event.target.value)}/>
        {field.help && <small>{field.help}</small>}
      </label>
    );
  }
  return (
    <label className="record-field">
      <span>{field.label}{field.required ? " *" : ""}</span>
      <input
        type={field.type === "number" ? "number" : "text"}
        value={String(value ?? "")}
        placeholder={field.placeholder}
        onChange={event => onChange(field.type === "number" ? (event.target.value === "" ? "" : Number(event.target.value)) : event.target.value)}
      />
      {field.help && <small>{field.help}</small>}
    </label>
  );
}

export type RecordComposerProps = {
  kind: RecordKind;
  record?: WorkspaceRecord | null;
  onClose: () => void;
  onSubmit: (draft: RecordDraft) => Promise<boolean>;
  onDelete?: (record: WorkspaceRecord) => Promise<boolean>;
};

export function RecordComposer({ kind, record, onClose, onSubmit, onDelete }: RecordComposerProps) {
  const schema = RECORD_SCHEMAS[kind];
  const [draft, setDraft] = useState<RecordDraft>(() => initialValues(kind, record));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function set(field: RecordField, value: MetricValue) {
    setDraft(current => {
      if (field.column === "title") return { ...current, title: String(value) };
      if (field.column === "starred") return { ...current, starred: Boolean(value) };
      if (field.column) return { ...current, [field.column]: String(value) } as RecordDraft;
      return { ...current, metrics: { ...current.metrics, [field.metric!.key]: value } };
    });
  }

  function read(field: RecordField): MetricValue | string | undefined {
    if (field.column === "title") return draft.title;
    if (field.column === "starred") return draft.starred;
    if (field.column) return (draft as Record<string, unknown>)[field.column] as string | undefined;
    return draft.metrics?.[field.metric!.key];
  }

  const missing = schema.fields.filter(field => field.required && !String(draft.title).trim() && field.column === "title");

  async function submit() {
    if (!draft.title.trim()) { setError("A title is required."); return; }
    setBusy(true);
    setError("");
    const ok = await onSubmit(draft);
    setBusy(false);
    if (!ok) setError("That change could not be saved.");
  }

  return (
    <div className="record-modal" role="dialog" aria-modal="true" aria-label={`${record ? "Edit" : "New"} ${schema.label}`}>
      <div className="record-modal-backdrop" onClick={onClose}/>
      <div className="record-modal-card">
        <div className="record-modal-head">
          <h3>{record ? `Edit ${schema.label}` : `New ${schema.label}`}</h3>
          <button className="icon-button" onClick={onClose} aria-label="Close"><X size={15}/></button>
        </div>
        <div className="record-form">
          {schema.fields.map(field => <Field key={field.name} field={field} value={read(field)} onChange={value => set(field, value)}/>)}
        </div>
        {error && <p className="record-form-error">{error}</p>}
        <div className="record-modal-actions">
          {record && onDelete && (
            <button className="record-danger" disabled={busy} onClick={() => { void onDelete(record).then(ok => { if (ok) onClose(); }); }}>
              <Trash2 size={13}/> Delete
            </button>
          )}
          <button className="record-secondary" disabled={busy} onClick={onClose}>Cancel</button>
          <button className="primary-button" disabled={busy || missing.length > 0} onClick={() => void submit()}>
            {busy ? "Saving…" : record ? "Save changes" : `Create ${schema.label}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export type RecordComposerHost = {
  create: (draft: RecordDraft) => Promise<unknown>;
  update: (id: string, patch: Partial<RecordDraft> & { status?: string }) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
};

export type RecordComposerController = {
  /** Render once anywhere in the dashboard; it is `null` while closed. */
  composer: React.ReactNode;
  openNew: () => void;
  openEdit: (record: WorkspaceRecord) => void;
  editing: WorkspaceRecord | null;
};

/** Owns the create/edit dialog for one record kind. */
export function useRecordComposer(kind: RecordKind, host: RecordComposerHost): RecordComposerController {
  const [editing, setEditing] = useState<WorkspaceRecord | null>(null);
  const [open, setOpen] = useState(false);

  const close = useCallback(() => { setOpen(false); setEditing(null); }, []);
  const openNew = useCallback(() => { setEditing(null); setOpen(true); }, []);
  const openEdit = useCallback((record: WorkspaceRecord) => { setEditing(record); setOpen(true); }, []);

  return {
    editing,
    openNew,
    openEdit,
    composer: open ? (
      <RecordComposer
        kind={kind}
        record={editing}
        onClose={close}
        onSubmit={async draft => {
          const ok = editing
            ? await host.update(editing.id, draft)
            : Boolean(await host.create(draft));
          if (ok) close();
          return ok;
        }}
        onDelete={editing ? async record => host.remove(record.id) : undefined}
      />
    ) : null,
  };
}