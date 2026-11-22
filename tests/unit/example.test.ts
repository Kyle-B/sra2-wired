import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { SYSTEM_ID } from "@module/constants.ts";
// Example unit spec — paired with the ExampleApp demo.
// It shows the vitest tier: pure Node, no Foundry, no browser,
import { describe, it, expect } from "vitest";

const manifest = JSON.parse(
    readFileSync(fileURLToPath(new URL("../../system.json", import.meta.url)), "utf8"),
) as { id: string };

describe("module identity", () => {
    it("SYSTEM_ID is the id the manifest ships", () => {
        expect(SYSTEM_ID).toBe(manifest.id);
    });
});
