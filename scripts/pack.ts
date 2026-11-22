// Build the compendium packs system.json registers, from their JSON sources. Run by `pnpm run
// build`
//
// If Foundry holds a pack open (LevelDB lock), the existing build is kept and we warn rather than
// fail; close Foundry to refresh it. Manual single-pack rebuild:
//   npm run pack -- <name> --in packs/_source/<name> --out packs
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { packCompendium } from "./pack-leveldb.ts";

const ROOT = process.cwd();
const SOURCE = join(ROOT, "packs");
const DEST = join(ROOT, "dist", "packs");
if (!existsSync(SOURCE)) process.exit(0);

interface PackEntry {
    name: string;
}
const manifest = JSON.parse(readFileSync(join(ROOT, "system.json"), "utf8")) as {
    packs?: PackEntry[];
};
const packs = manifest.packs ?? [];

for (const pack of packs) {
    const dir = join(SOURCE, pack.name);
    if (!dir) {
        console.warn(
            `⚠ pack "${pack.name}" registered in system.json but no source at packs/_source/${pack.name} - skipping.`,
        );
        continue;
    }
    if (!packCompendium(pack.name, dir, DEST)) {
        console.warn(
            `⚠ pack "${pack.name}" not rebuilt (is Foundry holding it open? LevelDB lock) - keeping the existing build.`,
        );
    }
}
