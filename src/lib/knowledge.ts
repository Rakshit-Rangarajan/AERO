import { mkdir, realpath } from "node:fs/promises";
import path from "node:path";

export const knowledgeFolders = ["Tickets", "Notes", "RCAS", "Research", ".aero"] as const;

export async function ensureKnowledgeFolders(rootInput: string) {
  const root = path.resolve(rootInput);
  await mkdir(root, { recursive: true });
  const canonicalRoot = await realpath(/* turbopackIgnore: true */ root);
  for (const folder of knowledgeFolders) {
    const target = path.join(/* turbopackIgnore: true */ canonicalRoot, folder);
    if (path.dirname(target) !== canonicalRoot) throw new Error("Invalid knowledge folder path.");
    try {
      await mkdir(target, { recursive: false });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
    const canonicalTarget = await realpath(/* turbopackIgnore: true */ target);
    if (path.dirname(canonicalTarget) !== canonicalRoot) throw new Error(`The ${folder} folder resolves outside the configured knowledge root.`);
  }
  return { root: canonicalRoot, folders: knowledgeFolders };
}
