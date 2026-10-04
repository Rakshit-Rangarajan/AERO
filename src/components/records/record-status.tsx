"use client";

import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

export type RecordStatusProps = {
  loading: boolean;
  error: string;
  count: number;
  noun: string;
  icon?: LucideIcon;
  emptyTitle?: string;
  emptyBody?: string;
};

/** Loading, error and empty presentation shared by every record-backed dashboard. */
export function RecordStatus({ loading, error, count, noun, icon: Icon = Inbox, emptyTitle, emptyBody }: RecordStatusProps) {
  if (loading) return <p className="record-status">Loading {noun}…</p>;
  if (error) return <p className="record-status record-status-error">{error}</p>;
  if (count > 0) return null;
  return (
    <div className="activity-empty record-empty">
      <div className="activity-pulse"><Icon size={16}/></div>
      <div>
        <strong>{emptyTitle ?? `No ${noun} yet`}</strong>
        <p>{emptyBody ?? `Add a record and it is stored in this workspace, so it survives restarts.`}</p>
      </div>
    </div>
  );
}