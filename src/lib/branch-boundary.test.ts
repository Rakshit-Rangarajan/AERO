import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";

describe("mainline demo isolation", () => {
  it("contains no demo-only runtime entry points", () => {
    for (const entry of [
      "src/app/api/demo/route.ts",
      "src/components/demo-workbench.tsx",
      "src/lib/demo-catalog.ts",
      "src/lib/demo-mode.ts",
      "src/lib/presenter-journey.ts",
      "src/components/development-cycle-dashboard.tsx",
    ]) expect(existsSync(path.resolve(process.cwd(), entry)), entry).toBe(false);
  });
});
