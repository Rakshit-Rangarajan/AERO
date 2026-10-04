import { afterEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readFile, realpath, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ensureKnowledgeFolders } from "./knowledge";

const temporaryRoots: string[] = [];

async function temporaryRoot() {
  const root = await mkdtemp(path.join(os.tmpdir(), "aero-knowledge-test-"));
  temporaryRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe("ensureKnowledgeFolders", () => {
  it("creates only the missing standard folders and preserves existing content", async () => {
    const root = await temporaryRoot();
    const notes = path.join(root, "Notes");
    await mkdir(notes);
    await writeFile(path.join(notes, "existing.md"), "Keep this note", "utf8");

    const result = await ensureKnowledgeFolders(root);

    expect(result.folders).toEqual(["Tickets", "Notes", "RCAS", "Research", ".aero"]);
    expect(await readFile(path.join(notes, "existing.md"), "utf8")).toBe("Keep this note");
    for (const folder of result.folders) expect((await stat(path.join(root, folder))).isDirectory()).toBe(true);
  });

  it("is safe to run repeatedly", async () => {
    const root = await temporaryRoot();
    await ensureKnowledgeFolders(root);
    const result = await ensureKnowledgeFolders(root);
    expect(result.root).toBe(await realpath(root));
    expect(result.folders).toEqual(["Tickets", "Notes", "RCAS", "Research", ".aero"]);
  });
});
