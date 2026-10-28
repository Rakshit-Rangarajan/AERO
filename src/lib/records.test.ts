import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { RECORD_KINDS } from "@/lib/record-schemas";

async function loadRecords() {
  // The data directory must be set before the database module connects.
  const { getDb } = await import("@/lib/db");
  const records = await import("@/lib/records");
  getDb();
  return records;
}

describe("workspace records", () => {
  let dataDir: string;

  beforeAll(() => {
    // One directory for the file: the database handle is memoized per process.
    dataDir = mkdtempSync(path.join(tmpdir(), "aero-records-"));
    process.env.AERO_DATA_DIR = dataDir;
  });

  beforeEach(async () => {
    const { getDb } = await import("@/lib/db");
    getDb().exec("DELETE FROM workspace_records; DELETE FROM audit_events;");
  });

  afterAll(() => {
    try {
      rmSync(dataDir, { recursive: true, force: true });
    } catch {
      // The open SQLite handle can still hold the file on Windows.
    }
  });

  it("starts empty for every kind in a non-demo workspace", async () => {
    const { listRecords } = await loadRecords();
    for (const kind of RECORD_KINDS) {
      expect(listRecords(kind), `${kind} should start empty`).toEqual([]);
    }
  });

  it("persists a created record and returns it on the next read", async () => {
    const { createRecord, listRecords, deleteRecord } = await loadRecords();
    const created = createRecord({
      kind: "release",
      title: "v2.0.0 Probe",
      repo: "aero-platform",
      owner: "tester",
      metrics: { commits: 7 },
    });
    expect(created.id).toBeTruthy();
    expect(created.status).toBe("staging");

    const stored = listRecords("release");
    expect(stored).toHaveLength(1);
    expect(stored[0].title).toBe("v2.0.0 Probe");
    expect(stored[0].metrics.commits).toBe(7);

    expect(deleteRecord(created.id)).toBe(true);
    expect(listRecords("release")).toEqual([]);
  });

  it("rejects blank titles and unknown metrics", async () => {
    const { createRecord, listRecords } = await loadRecords();
    expect(() => createRecord({ kind: "release", title: "   " })).toThrow();
    const record = createRecord({ kind: "release", title: "Valid", metrics: { commits: 3, injected: "nope" } });
    expect(record.metrics.commits).toBe(3);
    expect(record.metrics.injected).toBeUndefined();
    expect(listRecords("release")).toHaveLength(1);
  });

  it("keeps kinds isolated from each other", async () => {
    const { createRecord, listRecords } = await loadRecords();
    createRecord({ kind: "release", title: "Release A" });
    createRecord({ kind: "test-run", title: "Run A" });
    expect(listRecords("release").map(item => item.title)).toEqual(["Release A"]);
    expect(listRecords("test-run").map(item => item.title)).toEqual(["Run A"]);
  });

  it("advances status, records an audit event and toggles the star", async () => {
    const { createRecord, updateRecord, listRecords } = await loadRecords();
    const created = createRecord({ kind: "pull-request", title: "PR probe", repo: "aero-platform" });
    expect(created.status).toBe("open");

    const merged = updateRecord(created.id, { status: "merged" });
    expect(merged?.status).toBe("merged");

    const starred = updateRecord(created.id, { starred: true });
    expect(starred?.starred).toBe(true);

    const audit = await import("@/lib/db");
    const events = audit.getDb().prepare("SELECT action FROM audit_events WHERE action='pull-request.status_changed'").all();
    expect(events).toHaveLength(1);
    expect(listRecords("pull-request")[0].starred).toBe(true);
  });

  it("falls back to the default status when an invalid one is sent", async () => {
    const { createRecord, updateRecord } = await loadRecords();
    const created = createRecord({ kind: "review", title: "Review probe" });
    expect(created.status).toBe("pending");
    expect(updateRecord(created.id, { status: "not-a-status" })?.status).toBe("pending");
  });

  it("returns null when updating a record that no longer exists", async () => {
    const { updateRecord, deleteRecord } = await loadRecords();
    expect(updateRecord("missing-id", { title: "Nope" })).toBeNull();
    expect(deleteRecord("missing-id")).toBe(false);
  });

  it("allocates sequential display codes per kind", async () => {
    const { createRecord, listRecords, nextCode } = await loadRecords();
    createRecord({ kind: "incident", title: "First incident" });
    expect(nextCode("incident", "INC-")).toBe("INC-2");
    expect(listRecords("incident")[0].code).toBe("INC-1");
  });
});