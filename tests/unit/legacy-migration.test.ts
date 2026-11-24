import {
    isLegacyTrack,
    legacyDamageTrack,
    migrateActorDocument,
    groupLegacyAmp,
    legacyItemType,
    legacyRREntries,
    migrateAmpDocument,
    migrateCharacter,
    migrateIce,
    migrateItemDocument,
    migrateMetatype,
    migrateServer,
    migrateSkill,
    migrateSpecialization,
    migrateVehicle,
    resolveSkillRef,
    resolveSpecializationRef,
} from "@migration/legacy/index.ts";
import { VehicleModel } from "@models/actor/vehicle.ts";
import { KnowledgeModel } from "@models/item/knowledge.ts";
import { describe, expect, it } from "vitest";

import { importLegacyAmp } from "../fixtures/amp.ts";
import {
    intendedCostChange,
    intendedRatingChange,
    LEGACY_AMP_CASES,
} from "../fixtures/legacy-amps.ts";

const migrated = <T extends Record<string, unknown>>(
    fn: (s: Record<string, unknown>) => void,
    source: T,
) => {
    const copy = structuredClone(source) as Record<string, unknown>;
    fn(copy);
    return copy;
};

describe("references", () => {
    it("old astral combat skill references become close combat (now a specialization)", () => {
        expect(resolveSkillRef("Combat astral")).toBe("closeCombat");
        expect(resolveSkillRef("astral-combat")).toBe("closeCombat");
        expect(resolveSpecializationRef("Spé : Combat astral")).toBe("spec_astralCombat");
    });

    it("resolves EN/FR skill names and keeps slugs", () => {
        expect(resolveSkillRef("Combat rapproché")).toBe("closeCombat");
        expect(resolveSkillRef("Close Combat")).toBe("closeCombat");
        expect(resolveSkillRef("hacking")).toBe("cracking");
        expect(resolveSkillRef("rangedWeapons")).toBe("rangedWeapons");
        expect(resolveSkillRef("")).toBe("");
    });

    it("puts old kebab-case slugs in the current camelCase format", () => {
        expect(resolveSkillRef("ranged-weapons")).toBe("rangedWeapons");
        expect(resolveSkillRef("cuisine-moleculaire")).toBe("cuisineMoleculaire");
        expect(resolveSpecializationRef("spec_flying-drones")).toBe("spec_flyingDrones");
        expect(resolveSpecializationRef("spec_flyingDrones")).toBe("spec_flyingDrones");
        expect(
            migrated(migrateItemDocument, {
                type: "skill",
                name: "Armes à distance",
                system: { slug: "ranged-weapons" },
            }),
        ).toMatchObject({ system: { slug: "rangedWeapons" } });
    });

    it("slugifies unknown homebrew names in camelCase", () => {
        expect(resolveSkillRef("Cuisine Moléculaire")).toBe("cuisineMoleculaire");
        expect(resolveSkillRef("cyberHacking")).toBe("cyberHacking");
        expect(resolveSpecializationRef("Spé : Origami Avancé")).toBe("spec_origamiAvance");
    });

    it("maps the old packs' archery item to spec_archery", () => {
        expect(resolveSpecializationRef("Spé : Armes de trait")).toBe("spec_archery");
        expect(resolveSpecializationRef("Spec: Archery")).toBe("spec_archery");
    });

    it("resolves specialization names and keeps slugs", () => {
        expect(resolveSpecializationRef("Spé : Pistolets")).toBe("spec_pistols");
        expect(resolveSpecializationRef("spec_blades")).toBe("spec_blades");
    });
});

describe("old damage values (DV)", () => {
    const dv = (system: Record<string, unknown>) =>
        (
            importDoc({
                type: "feat",
                name: "x",
                system: { featType: "weapon", rrList: [], ...system },
            }).doc["system"] as { attack: { dv: unknown } }
        ).attack.dv;
    const fixed = (value: number) => ({ mode: "fixed", value, attribute: null });

    it("a number is a fixed DV", () => {
        expect(dv({ damageValue: "5" })).toEqual(fixed(5));
        expect(dv({ damageValue: 7 })).toEqual(fixed(7));
    });

    it("toxin stays toxin", () => {
        expect(dv({ damageValue: "toxin" })).toEqual({ mode: "toxin", value: 0, attribute: null });
    });

    it("anything else is the attribute and bonus the old feat kept beside the string", () => {
        expect(dv({ damageValue: "FOR+2", vdAttribute: "strength", vdBonus: 2 })).toEqual({
            mode: "attribute",
            value: 2,
            attribute: "strength",
        });
        expect(dv({ damageValue: "AGI", vdAttribute: "agility" })).toEqual({
            mode: "attribute",
            value: 0,
            attribute: "agility",
        });
        // No attribute stored: none is assumed.
        expect(dv({ damageValue: "FOR+2", vdBonus: 2 })).toEqual({
            mode: "attribute",
            value: 2,
            attribute: null,
        });
    });

    it("without a string, a custom weapon's vdMode picks its vd value", () => {
        expect(dv({ vdMode: "attribute", vdAttribute: "agility", vdBonus: 1 })).toEqual({
            mode: "attribute",
            value: 1,
            attribute: "agility",
        });
        expect(dv({ vdMode: "custom", vdCustomValue: 6 })).toEqual(fixed(6));
    });
});

describe("legacyDamageTrack", () => {
    it("counts filled boxes, renames severe to serious and counts the incapacitated box", () => {
        expect(
            legacyDamageTrack({
                light: [true, false, true],
                severe: [false],
                incapacitating: true,
            }),
        ).toEqual({
            light: 2,
            serious: 0,
            incapacitating: 1,
        });
        // Counts with the old "severe" name and incapacitated flag.
        expect(legacyDamageTrack({ light: 1, serious: 1, incapacitating: 0 })).toEqual({
            light: 1,
            serious: 1,
            incapacitating: 0,
        });
        // Current tracks pass through.
        const current = { light: 1, serious: 1, incapacitating: 1 };
        expect(isLegacyTrack(current)).toBe(false);
        expect(legacyDamageTrack(current)).toEqual(current);
    });
});

/** Import an old feat item source, collecting warnings instead of logging them. */
function importDoc(source: Record<string, unknown>) {
    const doc = structuredClone(source);
    const warnings: string[] = [];
    const dropped = migrateAmpDocument(doc, (m) => warnings.push(m));
    return { doc, dropped, warnings };
}

describe("amp import", () => {
    it("an old knowledge feat becomes a knowledge item, at a flat price", () => {
        const doc: Record<string, unknown> = {
            type: "feat",
            name: "Corporate Politics",
            system: {
                featType: "connaissance",
                description: "<p>Who owns whom.</p>",
                rating: 1,
                rrList: [],
            },
        };
        migrateItemDocument(doc);
        expect(doc["type"]).toBe("knowledge");
        // Only the description fields remain; the old rating is superseded, not reported.
        expect(doc["system"]).toEqual({
            description: "<p>Who owns whom.</p>",
            gmDescription: "",
            reference: "",
            bookmarked: false,
            slug: "corporatePolitics",
        });
        const knowledge = new KnowledgeModel(doc["system"] as object);
        knowledge.prepareDerivedData();
        // The old cost priced its rating too (7,500 at rating 1); a knowledge has no rating now.
        expect(knowledge.cost).toBe(2_500);
    });

    it.each(LEGACY_AMP_CASES)(
        "$name: rating and cost match the old level and cost (plus intended changes)",
        ({ source, expected }) => {
            const { data } = importLegacyAmp(source);
            expect({ rating: data.computeRating().rating, cost: data.computeCost() }).toEqual({
                rating: expected.level + intendedRatingChange(source),
                cost: expected.cost + intendedCostChange(source, expected.level),
            });
        },
    );

    it("old weapon presets and range bands take their current names", () => {
        const { doc } = importDoc({
            type: "feat",
            name: "Hold-out",
            system: {
                featType: "weapon",
                weaponType: "pocket-pistols",
                meleeRange: "dice",
                shortRange: "ok",
                rangeImprovements: { melee: true, short: false, medium: false, long: false },
                rrList: [],
            },
        });
        expect(doc["system"]).toMatchObject({
            weaponType: "holdoutPistols",
            ranges: { close: "none", short: "ok" },
            improvedRanges: { close: true, short: false },
        });
        expect(
            importDoc({
                type: "feat",
                name: "Machine pistol",
                system: { featType: "weapon", weaponType: "automatic-pistols", rrList: [] },
            }).doc["system"],
        ).toMatchObject({ weaponType: "machinePistols" });
    });

    it("imports an old weapon feat into the weapon model's fields", () => {
        const { doc, dropped, warnings } = importDoc({
            type: "feat",
            name: "Ares Predator",
            system: {
                featType: "weapon",
                cost: "specialized-equipment",
                weaponType: "custom-weapon",
                vdMode: "attribute",
                vdAttribute: "agility",
                vdBonus: 2,
                damageValue: "agility+2",
                linkedAttackSkill: "Armes à distance",
                linkedAttackSpecialization: "Spé : Pistolets",
                meleeRange: "ok",
                rangeImprovements: { melee: true, short: false, medium: false, long: false },
                rrList: [
                    {
                        rrType: "skill",
                        rrValue: 1,
                        rrTarget: "Athlétisme",
                        rrLabel: "si à couvert",
                    },
                ],
                bonusLightDamage: 1,
                narrativeEffects: [{ text: "Bruyant", isNegative: true, value: 1 }],
                autopilotBonus: 2,
                connectionMode: "ar",
                firewall: 2,
                attack: 3,
            },
        });
        expect(doc["type"]).toBe("weapon");
        expect(doc["system"]).toMatchObject({
            costTier: "advancedEquipment",
            weaponType: "customWeapon",
            attack: {
                dv: { mode: "attribute", value: 2, attribute: "agility" },
                skill: "rangedWeapons",
                specialization: "spec_pistols",
            },
            ranges: { close: "ok" },
            improvedRanges: { close: true },
            rr: [{ type: "skill", target: "athletics", value: 1, label: "si à couvert" }],
            narrativeEffects: [{ text: "Bruyant", value: -1 }],
        });
        // Only the weapon model's fields remain; values a weapon can't hold (bought boxes, deck
        // values) are reported.
        const system = doc["system"] as Record<string, unknown>;
        expect(
            [
                "featType",
                "ampType",
                "cost",
                "weapon",
                "cyberdeck",
                "firewall",
                "extraDamageBoxes",
            ].filter((k) => k in system),
        ).toEqual([]);
        expect(dropped).toEqual([
            "bonuses.damageBoxes.light",
            "cyberdeck.firewall",
            "cyberdeck.attack",
        ]);
        expect(warnings).toEqual([
            'sra2-wired | Imported "Ares Predator" as weapon; dropped fields it has no place for: bonuses.damageBoxes.light, cyberdeck.firewall, cyberdeck.attack',
        ]);
    });

    it.each([
        ["trait", { isFirstFeat: true }, "quality", { isFirstQuality: true }],
        ["vehicle", {}, "equipment", {}],
        [
            "cyberware",
            { essenceCost: 1, armorValue: 2 },
            "cyberware",
            { essenceCost: 1, armorBonus: true },
        ],
        [
            "cyberware",
            { essenceCost: 0.5, isBioware: true, armorValue: 2 },
            "bioware",
            { essenceCost: 0.5, armorBonus: true },
        ],
        ["armor", { armorValue: 3 }, "armor", { armor: 3 }],
        [
            "cyberdeck",
            {
                firewall: 3,
                attack: 2,
                cyberdeckBiofeedback: true,
                cyberdeckBonusLightDamage: true,
                cyberdeckDamage: { light: [true], severe: [], incapacitating: false },
            },
            "cyberdeck",
            {
                firewall: 3,
                attackRating: 2,
                programs: { biofeedback: true },
                // The old extra light box becomes +1 light box on the deck itself.
                extraDamageBoxes: { light: 1, serious: 0 },
                damage: { light: 1, serious: 0, incapacitating: 0 },
            },
        ],
        [
            "spell",
            { spellType: "indirect", spellSpecializationType: "health" },
            "spell",
            { spellType: "indirect", category: "health" },
        ],
        [
            "complex-form",
            { complexFormSpecializationType: "formes-complexes" },
            "complexForm",
            { category: "complexForms" },
        ],
        [
            "emerged",
            { matrixAccess: true, compiledSpriteCount: 1 },
            "emerged",
            { matrixAccess: true, compiledSprites: 1 },
        ],
        [
            "awakened",
            { sorcery: true, shamanicMask: true },
            "awakened",
            { sorcery: true, shamanicMask: true },
        ],
        ["contact", { contactName: "Fixer" }, "contact", { contactName: "Fixer" }],
    ] as const)("old %s feat → %s", (featType, fields, type, expected) => {
        const { doc, dropped } = importDoc({
            type: "feat",
            name: "x",
            system: { featType, rrList: [], ...fields },
        });
        expect(doc["type"]).toBe(type);
        expect(doc["system"]).toMatchObject(expected);
        expect(dropped).toEqual([]);
    });

    it("firewall is only carried over for decks (old feats all defaulted to 1)", () => {
        const { doc } = importDoc({
            type: "feat",
            name: "x",
            system: { featType: "equipment", firewall: 1, rrList: [] },
        });
        expect("firewall" in (doc["system"] as object)).toBe(false);
    });

    it("deck: link lock and lockdown renamed, maluses reported", () => {
        const { doc, dropped } = importDoc({
            type: "feat",
            name: "Deck",
            system: {
                featType: "cyberdeck",
                rrList: [],
                connectionLocked: true,
                cyberdeckConnectionLock: true,
                firewallMalus: 1,
                attackMalus: 2,
            },
        });
        expect(doc["system"]).toMatchObject({ linkLocked: true, programs: { lockdown: true } });
        expect(dropped).toEqual(["cyberdeck.firewallMalus", "cyberdeck.attackMalus"]);
    });

    it("weapon: the adept-power flag is reported, the spell display hint dropped silently", () => {
        const { doc, dropped } = importDoc({
            type: "feat",
            name: "Killing hands",
            system: { featType: "weapon", rrList: [], isAdeptPowerWeapon: true, isSpell: true },
        });
        expect(doc["system"]).not.toHaveProperty("isAdeptPower");
        expect(doc["system"]).not.toHaveProperty("attack.isSpell");
        expect(dropped).toEqual(["weapon.isAdeptPower"]);
    });

    it("reports values moved off a type, e.g. sustained spells on an awakened feat", () => {
        const { doc, dropped } = importDoc({
            type: "feat",
            name: "Shaman",
            system: { featType: "awakened", sustainedSpellCount: 2, rrList: [] },
        });
        expect(doc["type"]).toBe("awakened");
        expect(dropped).toEqual(["bonuses.sustainedSpells"]);
    });

    it.each([
        [{ type: "feat", system: { featType: "trait" } }, "quality"],
        [{ type: "feat", system: { featType: "cyberware", isBioware: true } }, "bioware"],
        [{ type: "feat", system: { featType: "connaissance" } }, "knowledge"],
        [{ type: "feat", system: { featType: "adept-power" } }, "adeptPower"],
        [{ type: "feat", system: { featType: "complex-form" } }, "complexForm"],
        [{ type: "feat", system: {} }, "equipment"],
        [{ type: "race", system: {} }, "metatype"],
        [{ type: "weapon", system: {} }, "weapon"],
    ])("legacyItemType(%j) → %s, without changing the source", (source, type) => {
        const copy = structuredClone(source);
        expect(legacyItemType(copy)).toBe(type);
        expect(copy).toEqual(source);
    });

    it("leaves current per-type items untouched", () => {
        const current = {
            type: "weapon",
            name: "x",
            system: { weaponType: "smgs", costTier: "equipment" },
        };
        expect(migrated(migrateItemDocument, current)).toEqual(current);
    });

    it("groupLegacyAmp converts the oldest parallel-array RR format", () => {
        const out = migrated(groupLegacyAmp, {
            featType: "trait",
            rrType: ["skill", "attribute"],
            rrValue: [1, 2],
            rrTarget: ["Furtivité", "willpower"],
            bonusLightDamage: 0,
        });
        expect(out["rr"]).toEqual([
            { type: "skill", target: "stealth", value: 1, label: "" },
            { type: "attribute", target: "willpower", value: 2, label: "" },
        ]);
    });
});

describe("item migrations", () => {
    it("metatype maxima move into maxAttributes", () => {
        expect(
            migrated(migrateMetatype, {
                maxStrength: 8,
                maxAgility: 5,
                maxWillpower: 6,
                maxLogic: 5,
                maxCharisma: 4,
                anarchyBonus: 1,
            }),
        ).toEqual({
            maxAttributes: { strength: 8, agility: 5, willpower: 6, logic: 5, charisma: 4 },
            // Old anarchy was 3 + the metatype's bonus; the metatype now sets the starting edge.
            edge: 4,
        });
    });

    it("specialization linkedSkill names become slugs", () => {
        expect(
            migrated(migrateSpecialization, { linkedSkill: "Électronique" })["linkedSkill"],
        ).toBe("electronics");
    });

    it("document level: the old Astral Combat skill becomes the close combat specialization", () => {
        const warnings: string[] = [];
        const skill = {
            type: "skill",
            name: "Combat astral",
            system: {
                description: "<p>Astral.</p>",
                rating: 3,
                linkedAttribute: "willpower",
                slug: "astral-combat",
            },
        };
        expect(legacyItemType(skill)).toBe("specialization");
        const doc = structuredClone(skill) as Record<string, unknown>;
        migrateItemDocument(doc, (m) => warnings.push(m));
        expect(doc).toEqual({
            type: "specialization",
            name: "Combat astral",
            system: {
                description: "<p>Astral.</p>",
                linkedSkill: "closeCombat",
                linkedAttributes: ["willpower"],
                slug: "spec_astralCombat",
            },
        });
        expect(warnings).toEqual([
            'sra2-wired | Imported the "Combat astral" skill as the spec_astralCombat specialization; dropped its rating (3)',
        ]);
        // Recognised by name when it has no slug; other skills are untouched.
        expect(legacyItemType({ type: "skill", name: "Astral Combat", system: {} })).toBe(
            "specialization",
        );
        expect(legacyItemType({ type: "skill", name: "Close Combat", system: {} })).toBe("skill");
    });

    it("references to the old Astral Combat skill target the specialization", () => {
        // RR on the skill becomes RR on the specialization.
        expect(
            legacyRREntries([
                { rrType: "skill", rrValue: 1, rrTarget: "Combat astral", rrLabel: "" },
            ]),
        ).toEqual([{ type: "specialization", target: "spec_astralCombat", value: 1, label: "" }]);
        // An attack with the skill rolls close combat with the specialization.
        const { doc } = importDoc({
            type: "feat",
            name: "Astral strike",
            system: {
                featType: "adept-power",
                linkedAttackSkill: "Combat astral",
                linkedDefenseSkill: "astral-combat",
                linkedDefenseSpecialization: "Spé : Défense",
                rrList: [],
            },
        });
        expect(doc["system"]).toMatchObject({
            attack: {
                skill: "closeCombat",
                specialization: "spec_astralCombat",
                defenseSkill: "closeCombat",
                // An existing specialization is kept.
                defenseSpecialization: "spec_defense",
            },
        });
        // A specialization's parent skill can only be the skill.
        expect(migrated(migrateSpecialization, { linkedSkill: "Combat astral" })).toEqual({
            linkedSkill: "closeCombat",
        });
    });

    it("old specializations take the book's names", () => {
        expect(resolveSpecializationRef("spec_shotguns")).toBe("spec_rifles");
        expect(resolveSpecializationRef("spec_stealth")).toBe("spec_palming");
        expect(resolveSpecializationRef("Spé : Escamotage")).toBe("spec_palming");
        expect(resolveSpecializationRef("spec_la-rue")).toBe("spec_street");
        expect(resolveSpecializationRef("spec_physical")).toBe("spec_physicalPerception");
        expect(resolveSpecializationRef("spec_cr-drones")).toBe("spec_brDrones");
        expect(resolveSpecializationRef("spec_aquatic-drones")).toBe("spec_waterDrones");
        // Swapped names: the old spellings map, but current slugs are never mapped again.
        expect(resolveSpecializationRef("spec_personal-devices")).toBe("spec_personalElectronics");
        expect(resolveSpecializationRef("spec_personal-electronics")).toBe("spec_brElectronics");
        expect(resolveSpecializationRef("spec_personalElectronics")).toBe(
            "spec_personalElectronics",
        );
        expect(resolveSpecializationRef("Spec: Personal Electronics")).toBe("spec_brElectronics");
    });

    it("update deltas (partial changes, no type) pass through the shims unchanged", () => {
        // Foundry runs migrations on update deltas too, before applying them.
        const deltas = [
            { _id: "abc", name: "Athlétisme" },
            { _id: "abc", system: { slug: "" } },
            { _id: "abc", system: { linkedAttributes: ["agility"] } },
            { _id: "abc", system: { linkedSkill: "stealth", slug: "spec_palming" } },
        ];
        for (const delta of deltas) expect(migrated(migrateItemDocument, delta)).toEqual(delta);
        for (const delta of deltas.map((d) => d.system).filter((d) => d !== undefined)) {
            expect(migrated(migrateSkill, delta)).toEqual(delta);
            expect(migrated(migrateSpecialization, delta)).toEqual(delta);
        }
    });

    it("an old item's single attribute becomes its list, whichever shim runs first", () => {
        // A canonical slug gets the table's list; other items keep their one attribute.
        expect(migrated(migrateSkill, { slug: "athletics", linkedAttribute: "Force" })).toEqual({
            slug: "athletics",
            linkedAttributes: ["strength", "agility"],
        });
        expect(
            migrated(migrateSpecialization, {
                slug: "spec_lockpicking",
                linkedAttribute: "agility",
            }),
        ).toEqual({ slug: "spec_lockpicking", linkedAttributes: ["agility", "logic"] });
        expect(migrated(migrateSkill, { slug: "cuisine", linkedAttribute: "Volonté" })).toEqual({
            slug: "cuisine",
            linkedAttributes: ["willpower"],
        });
        expect(
            migrated(migrateSpecialization, { linkedSkill: "Furtivité", slug: "spec_x" }),
        ).toEqual({ linkedSkill: "stealth", slug: "spec_x" });

        // Without a slug the system shim can't tell, so it leaves the old key for the document's.
        const blank = migrated(migrateSkill, { slug: "", linkedAttribute: "Force" });
        expect(blank).toEqual({
            slug: "",
            linkedAttribute: "Force",
            linkedAttributes: ["strength"],
        });
        const skill = (system: Record<string, unknown>) =>
            migrated(migrateItemDocument, { type: "skill", name: "Athlétisme", system });
        const expected = {
            type: "skill",
            name: "Athlétisme",
            system: { slug: "athletics", linkedAttributes: ["strength", "agility"] },
        };
        // System shim first, then the document's (by name)…
        expect(skill(blank)).toEqual(expected);
        // …or the document's first, then the system's.
        expect(
            migrated(
                migrateSkill,
                skill({ slug: "", linkedAttribute: "Force" })["system"] as Record<string, unknown>,
            ),
        ).toEqual(expected.system);

        // Current data is never touched.
        const current = { slug: "athletics", linkedAttributes: ["agility"] };
        expect(migrated(migrateSkill, current)).toEqual(current);
    });

    it("the old fangs specialization is now bite", () => {
        expect(resolveSpecializationRef("spec_fangs")).toBe("spec_bite");
        expect(resolveSpecializationRef("Spé : Crocs")).toBe("spec_bite");
        expect(resolveSpecializationRef("spec_bite")).toBe("spec_bite");
    });

    it("document level: repairs copies of the old packs' broken archery item", () => {
        const spec = (patch: Record<string, unknown>) =>
            migrated(migrateItemDocument, {
                type: "specialization",
                system: { slug: "spec_heavy-weapons" },
                ...patch,
            });
        // FR copy: recognised by name.
        expect(spec({ name: "Spé : Armes de trait" })).toMatchObject({
            system: { slug: "spec_archery" },
        });
        // EN copy: named like Thrown Weapons, recognised by pack id or compendium source, and renamed.
        expect(
            spec({
                name: "Spec: Thrown Weapons",
                _id: "XuqwhPGWShDDl7gk",
                system: { slug: "spec_thrown-weapons" },
            }),
        ).toMatchObject({
            name: "Spec: Archery",
            system: { slug: "spec_archery" },
        });
        expect(
            spec({
                name: "Spec: Thrown Weapons",
                _id: "aaaaaaaaaaaaaaaa",
                _stats: {
                    compendiumSource: "Compendium.sra2.anarchy-items-en.Item.XuqwhPGWShDDl7gk",
                },
            }),
        ).toMatchObject({ system: { slug: "spec_archery" } });
        // The real Heavy Weapons / Thrown Weapons items keep their slugs (in the current format).
        expect(spec({ name: "Spé : Armes lourdes", _id: "3sen4TvT31N5U0El" })).toMatchObject({
            system: { slug: "spec_heavyWeapons" },
        });
        expect(
            spec({
                name: "Spec: Thrown Weapons",
                _id: "TpIltxIMt9pouPjc",
                system: { slug: "spec_thrown-weapons" },
            }),
        ).toMatchObject({
            name: "Spec: Thrown Weapons",
            system: { slug: "spec_throwingWeapons" },
        });
    });

    it("document level: feats become their amp type, on items and embedded items", () => {
        const feat = {
            type: "feat",
            name: "Smartlink",
            system: { featType: "cyberware", rrList: [] },
        };
        expect(migrated(migrateItemDocument, feat)["type"]).toBe("cyberware");
        expect(migrated(migrateActorDocument, { items: [feat] })).toMatchObject({
            items: [{ type: "cyberware" }],
        });
    });

    it("document level: race → metatype, blank slugs filled from the name", () => {
        expect(
            migrated(migrateItemDocument, { type: "race", name: "Ork", system: {} })["type"],
        ).toBe("metatype");
        expect(
            migrated(migrateItemDocument, {
                type: "skill",
                name: "Furtivité",
                system: { slug: "" },
            }),
        ).toMatchObject({
            system: { slug: "stealth" },
        });
        expect(
            migrated(migrateItemDocument, {
                type: "skill",
                name: "Furtivité",
                system: { slug: "custom" },
            }),
        ).toMatchObject({ system: { slug: "custom" } });
        expect(
            migrated(migrateActorDocument, {
                items: [{ type: "specialization", name: "Spé : Lames", system: {} }],
            }),
        ).toMatchObject({ items: [{ system: { slug: "spec_blades" } }] });
    });
});

describe("actor migrations", () => {
    it("character: counts, numbered lists, nuyen, dropped fields", () => {
        const out = migrated(migrateCharacter, {
            attributes: { strength: 3, agility: 2, willpower: 2, logic: 2, charisma: 1 },
            resources: { yens: 12000, anarchy: 2 },
            damage: { light: [true, true, false], severe: [false], incapacitating: false },
            anarchySpent: [true, false, true],
            tempAnarchy: 2,
            tempAnarchySpent: [true, false],
            keywords: {
                keyword1: "Decker",
                keyword2: "",
                keyword3: "Paranoid",
                keyword4: "",
                keyword5: "",
            },
            behaviors: { behavior1: "Quiet", behavior2: "", behavior3: "", behavior4: "" },
            catchphrases: {
                catchphrase1: "",
                catchphrase2: "",
                catchphrase3: "",
                catchphrase4: "",
            },
            linkedVehicles: ["Actor.abc123", ""],
            armorLevel: 2,
            damageGaugeType: "physical",
        });
        expect(out).toEqual({
            attributes: { strength: 3, agility: 2, willpower: 2, logic: 2, charisma: 1 },
            nuyen: 12000,
            damage: { light: 2, serious: 0, incapacitating: 0 },
            // 3 anarchy boxes with 2 spent, plus 2 temporary with 1 spent: 2 edge left.
            edge: 2,
            keywords: ["Decker", "Paranoid"],
            behaviors: ["Quiet"],
            catchphrases: [],
            linkedVehicles: ["Actor.abc123"],
        });
    });

    it("character: the GM description moves out of bio", () => {
        expect(
            migrated(migrateCharacter, {
                bio: { background: "b", notes: "", gmDescription: "gm" },
            }),
        ).toEqual({ bio: { background: "b", notes: "" }, gmDescription: "gm" });
    });

    it("character: the even older anarchyNimbus field", () => {
        expect(migrated(migrateCharacter, { anarchyNimbus: [true, true, false] })["edge"]).toBe(1);
    });

    it("character: the old gender (an NPC-generator choice) is dropped", () => {
        expect(migrated(migrateCharacter, { gender: "random" })).toEqual({});
    });

    it("character: old kebab-case connection modes become camelCase", () => {
        expect(migrated(migrateCharacter, { connectionMode: "hot-sim" })).toEqual({
            connectionMode: "hotSim",
        });
        expect(migrated(migrateCharacter, { connectionMode: "coldSim" })).toEqual({
            connectionMode: "coldSim",
        });
    });

    it("vehicle: custom profile and upgrades grouped, derived weaponMount and weaponInfo dropped", () => {
        const out = migrated(migrateVehicle, {
            vehicleType: "",
            customAutopilot: 6,
            customStructure: 3,
            customWeaponMount: "smg",
            autopilotBonus: 1,
            isFlying: true,
            additionalDroneCount: 2,
            weaponMount: "rifle",
            weaponInfo: "Ares Alpha",
            rrList: [
                {
                    rrType: "specialization",
                    rrValue: 1,
                    rrTarget: "Spé : Drones volants",
                    rrLabel: "",
                },
            ],
            narrativeEffects: ["Silent", { text: "Fragile", isNegative: true, value: 2 }],
            damage: { light: [true, false], severe: [true], incapacitating: false },
        });
        expect(out).toEqual({
            vehicleType: null,
            customProfile: { autopilot: 6, structure: 3, weaponMount: "smg" },
            upgrades: { autopilot: 1, flying: true, additionalDrones: 2 },
            rr: [{ type: "specialization", target: "spec_flyingDrones", value: 1, label: "" }],
            narrativeEffects: [
                { text: "Silent", value: 1 },
                { text: "Fragile", value: -2 },
            ],
            damage: { light: 1, serious: 1, incapacitating: 0 },
        });
    });

    it.each([
        [
            "medium-drone (rifle), no upgrade",
            { vehicleType: "medium-drone", weaponMountImprovement: false },
            [{ size: "rifle", enhancements: "", cost: 0 }],
        ],
        [
            "small-drone (smg), upgraded",
            { vehicleType: "small-drone", weaponMountImprovement: true },
            [{ size: "rifle", enhancements: "", cost: 1 }],
        ],
        [
            "sedan (no mount), upgraded",
            { vehicleType: "sedan", weaponMountImprovement: true },
            [{ size: "smg", enhancements: "", cost: 0 }],
        ],
        [
            "sedan (no mount), no upgrade",
            { vehicleType: "sedan", weaponMountImprovement: false },
            [],
        ],
        [
            "custom (smg), upgraded",
            {
                vehicleType: "custom-vehicle",
                customWeaponMount: "smg",
                weaponMountImprovement: true,
            },
            [{ size: "rifle", enhancements: "", cost: 1 }],
        ],
    ])("old vehicle weapon mount → list: %s", (_name, old, mounts) => {
        const out = migrated(migrateVehicle, old);
        expect(out["weaponMounts"]).toEqual(mounts);
        expect(out).not.toHaveProperty("weaponMountImprovement");
    });

    it("old kebab-case preset keys become camelCase", () => {
        expect(migrated(migrateVehicle, { vehicleType: "medium-drone" })["vehicleType"]).toBe(
            "mediumDrone",
        );
        const { doc } = importDoc({
            type: "feat",
            name: "x",
            system: {
                featType: "equipment",
                rrList: [],
                weaponDamageBonus: 1,
                weaponTypeBonus: "heavy-pistols",
            },
        });
        expect(doc["system"]).toMatchObject({
            weaponDamage: { value: 1, weaponType: "heavyPistols" },
        });
    });

    it("vehicles without the old mount flag (e.g. partial updates) are untouched", () => {
        expect(migrated(migrateVehicle, { upgrades: { autopilot: 2 } })).toEqual({
            upgrades: { autopilot: 2 },
        });
    });
    it("imported mounts keep the old vehicle cost", () => {
        const cost = (old: Record<string, unknown>) => {
            const out = migrated(migrateVehicle, old);
            return new VehicleModel(out).computeCost();
        };
        // The old upgrade cost exactly one level, now 1 rating (5,000) whatever the base mount was.
        for (const vehicleType of ["medium-drone", "small-drone", "sedan"]) {
            expect(cost({ vehicleType, weaponMountImprovement: true })).toBe(
                cost({ vehicleType, weaponMountImprovement: false }) + 5_000,
            );
        }
    });

    it.each([
        ["blocker", "jammer"],
        ["glue", "tar"],
        ["tracker", "track"],
        ["killer", "killer"],
    ])("ice type %s → %s", (old, current) => {
        expect(migrated(migrateIce, { iceType: old })["iceType"]).toBe(current);
    });

    it("ice and server", () => {
        expect(
            migrated(migrateIce, {
                iceType: "",
                serverIndex: 3,
                damage: { light: [true], severe: [], incapacitating: false },
            }),
        ).toEqual({
            iceType: null,
            hostRating: 3,
            damage: { light: 1, serious: 0, incapacitating: 0 },
        });
        expect(migrated(migrateServer, { serverIndex: 5, linkedICE: ["Actor.x1", ""] })).toEqual({
            hostRating: 5,
            linkedIce: ["Actor.x1"],
        });
        // Current data passes through.
        expect(migrated(migrateIce, { hostRating: 3 })).toEqual({ hostRating: 3 });
    });
});
