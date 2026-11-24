/**
 * Differential test against the old system. Loads the old `computeFeatLevel` / `computeFeatCost`
 * and the old NPC generator's feat templates (hundreds of real old-format feats) from
 * `examples/old-sra2`, imports each as an amp with the item shim, and checks the new rules produce
 * the same rating (old: level) and cost, apart from the intended rule changes listed in
 * `intendedRatingChange`.
 *
 * `examples/` is gitignored, so this suite is skipped wherever the old checkout is absent (e.g.
 * CI).
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { importLegacyAmp } from "../fixtures/amp.ts";
import {
    intendedCostChange,
    intendedRatingChange,
    LEGACY_AMP_CASES,
} from "../fixtures/legacy-amps.ts";

const OLD = fileURLToPath(new URL("../../examples/old-sra2/src/module/", import.meta.url));
const hasOld = existsSync(`${OLD}models/item-feat.ts`);

/** A feat in the old sra2 shape. */
type OldFeat = Record<string, unknown> & { featType: string; name?: string };

async function loadOld() {
    // The old model file defines a TypeDataModel subclass at module level; the Foundry stand-in
    // (tests/setup/foundry-mocks.ts) covers that.
    const model = await import(`${OLD}models/item-feat.ts`);
    const npc = await import(`${OLD}config/npc-generator-data.ts`);
    const feats: OldFeat[] = [];
    const seen = new Set<unknown>();
    const collect = (v: unknown) => {
        if (typeof v !== "object" || v === null || seen.has(v)) return;
        seen.add(v);
        if (!Array.isArray(v) && typeof (v as OldFeat).featType === "string" && "rrList" in v) {
            // Old knowledge feats become knowledge items, not amps (tested in legacy-migration).
            const feat = v as unknown as OldFeat;
            if (feat.featType !== "connaissance") feats.push(feat);
            return;
        }
        for (const child of Object.values(v)) collect(child);
    };
    collect(npc);
    return {
        oldLevel: model.computeFeatLevel as (t: string, d: object) => { level: number },
        oldCost: model.computeFeatCost as (t: string, d: object) => number,
        feats,
    };
}

/**
 * The templates are partials; in a real world the old schema fills missing fields with their
 * initial values. The only old initial value that affects level is `firewall: 1`.
 */
function withOldDefaults(old: OldFeat): OldFeat {
    const filled: OldFeat = { firewall: 1, ...old };
    // The old FeatDataModel.prepareDerivedData set this before computing the level.
    if (filled["astralProjection"]) filled["astralPerception"] = true;
    // Intended change: deck attack rating only counts on cyberdecks (it counted on every feat type).
    if (filled.featType !== "cyberdeck") filled["attack"] = 0;
    return filled;
}

describe.skipIf(!hasOld)("parity with old sra2 feat rules", async () => {
    const { oldLevel, oldCost, feats } = hasOld
        ? await loadOld()
        : { oldLevel: null!, oldCost: null!, feats: [] };

    it("found a meaningful corpus", () => {
        expect(feats.length).toBeGreaterThan(100);
    });

    it("imports every NPC-generator feat, dropping only removed rules", () => {
        const removed = [
            "bonuses.thresholds.",
            "bonuses.narrations",
            "bonuses.anarchy",
            "weapon.isAdeptPower",
            "cyberdeck.firewallMalus",
            "cyberdeck.attackMalus",
        ];
        const dropped = feats.flatMap((old) => importLegacyAmp(old).dropped);
        expect(dropped.length).toBeGreaterThan(0);
        expect(dropped.filter((path) => !removed.some((r) => path.startsWith(r)))).toEqual([]);
    });

    it("rating matches the old level for every NPC-generator feat", () => {
        const mismatches = feats
            .map((old) => ({
                name: old.name,
                featType: old.featType,
                old: oldLevel(old.featType, withOldDefaults(old)).level + intendedRatingChange(old),
                new: importLegacyAmp(old).data.computeRating().rating,
            }))
            .filter((r) => r.old !== r.new);
        expect(mismatches).toEqual([]);
    });

    it("the intended rating changes are exercised by the corpus", () => {
        expect(feats.filter((old) => intendedRatingChange(old) !== 0).length).toBeGreaterThan(0);
    });

    it("cost matches for every NPC-generator feat (plus intended changes)", () => {
        const mismatches = feats
            .map((old) => ({
                name: old.name,
                old:
                    oldCost(old.featType, withOldDefaults(old)) +
                    intendedCostChange(old, oldLevel(old.featType, withOldDefaults(old)).level),
                new: importLegacyAmp(old).data.computeCost(),
            }))
            .filter((r) => r.old !== r.new);
        expect(mismatches).toEqual([]);
    });

    it("hand-written legacy fixtures still match the old rules", () => {
        const actual = LEGACY_AMP_CASES.map((c) => ({
            name: c.name,
            level: oldLevel(c.source.featType, withOldDefaults(c.source)).level,
            cost: oldCost(c.source.featType, withOldDefaults(c.source)),
        }));
        expect(actual).toEqual(LEGACY_AMP_CASES.map((c) => ({ name: c.name, ...c.expected })));
    });
});
