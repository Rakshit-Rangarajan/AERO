"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { MetricValue, RecordKind, WorkspaceRecord } from "@/lib/record-schemas";

export type { MetricValue };

export type RecordsState = {
  records: WorkspaceRecord[];
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  create: (input: RecordDraft) => Promise<WorkspaceRecord | null>;
  update: (id: string, patch: Partial<RecordDraft> & { status?: string }) => Promise<boolean>;
  setStatus: (record: WorkspaceRecord, status: string) => Promise<boolean>;
  toggleStar: (record: WorkspaceRecord) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
};

export type RecordDraft = {
  kind: RecordKind;
  title: string;
  code?: string;
  subtitle?: string;
  status?: string;
  severity?: string;
  owner?: string;
  repo?: string;
  starred?: boolean;
  notes?: string;
  metrics?: Record<string, MetricValue>;
};

/** Loads one record kind and exposes the CRUD the dashboard cards need. */
export function useRecords(kind: RecordKind): RecordsState {
  const [records, setRecords] = useState<WorkspaceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/records?kind=${kind}`).catch(() => null);
    if (!response || !response.ok) { setError("These records could not be loaded."); setLoading(false); return; }
    const payload = await response.json().catch(() => null) as { records?: WorkspaceRecord[] } | null;
    setRecords(payload?.records ?? []);
    setError("");
    setLoading(false);
  }, [kind]);

  useEffect(() => {
    const start = () => { void refresh(); };
    start();
  }, [refresh]);

  const create = useCallback(async (draft: RecordDraft) => {
    const response = await fetch("/api/records", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(draft) });
    const payload = await response.json().catch(() => null) as { record?: WorkspaceRecord; error?: string } | null;
    if (!response.ok || !payload?.record) { setError(payload?.error ?? "That record could not be saved."); return null; }
    await refresh();
    return payload.record;
  }, [refresh]);

  const update = useCallback(async (id: string, patch: Partial<RecordDraft> & { status?: string }) => {
    const response = await fetch("/api/records", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, ...patch }) });
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    if (!response.ok) { setError(payload?.error ?? "That change could not be saved."); return false; }
    await refresh();
    return true;
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    const response = await fetch(`/api/records?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) { setError("That record could not be deleted."); return false; }
    await refresh();
    return true;
  }, [refresh]);

  const setStatus = useCallback((record: WorkspaceRecord, status: string) => update(record.id, { status }), [update]);
  const toggleStar = useCallback((record: WorkspaceRecord) => update(record.id, { starred: !record.starred }), [update]);

  return useMemo(
    () => ({ records, loading, error, refresh, create, update, setStatus, toggleStar, remove }),
    [records, loading, error, refresh, create, update, setStatus, toggleStar, remove],
  );
}

/** Reads a metric with a type-safe fallback for dashboard rendering. */
export function metric(record: WorkspaceRecord, key: string): MetricValue | undefined {
  return record.metrics[key];
}

export function metricText(record: WorkspaceRecord, key: string, fallback = "—"): string {
  const value = record.metrics[key];
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
}

export function metricNumber(record: WorkspaceRecord, key: string, fallback = 0): number {
  const value = Number(record.metrics[key]);
  return Number.isFinite(value) ? value : fallback;
}

export function metricFlag(record: WorkspaceRecord, key: string): boolean {
  return record.metrics[key] === true || record.metrics[key] === "true";
}

/** Case-insensitive match across the fields a list row displays. */
export function matchesSearch(record: WorkspaceRecord, search: string, extra: MetricValue[] = []) {
  const term = search.trim().toLowerCase();
  if (!term) return true;
  const haystack = [record.title, record.subtitle, record.code, record.status, record.severity, record.owner, record.repo, record.notes, ...extra]
    .map(value => String(value ?? ""))
    .join(" ")
    .toLowerCase();
  return haystack.includes(term);
}

/** Relative age used for "updated" columns across the dashboards. */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.round(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}