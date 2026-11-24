import { legacyNarrativeEffects } from "@migration/legacy/index.ts";
import { COSTS } from "@system";

/**
 * Old-format (sra2) feat sources covering rules the NPC-generator corpus never exercises.
 * `expected` was produced by the old system's `computeFeatLevel` / `computeFeatCost`; the parity
 * suite re-verifies it whenever `examples/old-sra2` is present, and the CI suite checks the new
 * rules against it.
 */
export interface LegacyAmpCase {
    name: string;
    source: Record<string, unknown> & { featType: string };
    expected: { level: number; cost: number };
}

export const LEGACY_AMP_CASES: LegacyAmpCase[] = [
    {
        name: "trait, not first, with narrative effects of both signs",
        source: {
            featType: "trait",
            rrList: [],
            isFirstFeat: false,
            narrativeEffects: [
                { text: "Lucky", isNegative: false, value: 2 },
                { text: "Cursed", isNegative: true, value: -1 },
                { text: "", isNegative: false, value: 3 },
            ],
        },
        expected: { level: 4, cost: 0 },
    },
    {
        name: "first trait with narrations",
        source: {
            featType: "trait",
            rrList: [],
            isFirstFeat: true,
            grantsNarration: true,
            narrationActions: 2,
        },
        expected: { level: 6, cost: 0 },
    },
    {
        name: "weapon with range improvements, damage bonus, focus and RR",
        source: {
            featType: "weapon",
            cost: "advanced-equipment",
            rating: 1,
            weaponType: "heavy-pistols",
            damageValue: "5",
            damageValueBonus: 2,
            isWeaponFocus: true,
            rangeImprovements: { melee: false, short: true, medium: true, long: false },
            rrList: [
                { rrType: "specialization", rrValue: 1, rrTarget: "spec_pistols", rrLabel: "" },
            ],
        },
        expected: { level: 9, cost: 10000 },
    },
    {
        name: "cyberdeck with programs and extra box",
        source: {
            featType: "cyberdeck",
            cost: "equipment",
            firewall: 3,
            attack: 2,
            cyberdeckBonusLightDamage: true,
            cyberdeckBiofeedback: true,
            cyberdeckBiofeedbackFilter: true,
            cyberdeckConnectionLock: true,
            rrList: [],
        },
        expected: { level: 11, cost: 0 },
    },
    {
        name: "shaman with projection and mask",
        source: {
            featType: "awakened",
            astralProjection: true,
            sorcery: true,
            conjuration: true,
            shamanicMask: true,
            rrList: [{ rrType: "attribute", rrValue: 1, rrTarget: "willpower", rrLabel: "" }],
        },
        expected: { level: 14, cost: 0 },
    },
    {
        name: "quality granting sustained spells and spirits",
        source: { featType: "trait", sustainedSpellCount: 2, summonedSpiritCount: 1, rrList: [] },
        expected: { level: 10, cost: 0 },
    },
    {
        name: "technomancer",
        source: {
            featType: "emerged",
            matrixAccess: true,
            complexFormWeaving: true,
            spriteCompilation: true,
            biofeedback: true,
            compiledSpriteCount: 1,
            sustainedComplexFormCount: 2,
            rrList: [],
        },
        expected: { level: 14, cost: 0 },
    },
    {
        name: "bioware with thresholds of both signs and anarchy",
        source: {
            featType: "cyberware",
            isBioware: true,
            essenceCost: 0.5,
            bonusPhysicalThreshold: 2,
            bonusMentalThreshold: -1,
            bonusMatrixThreshold: 1,
            bonusAnarchy: 1,
            bonusSevereDamage: 1,
            rating: 2,
            rrList: [{ rrType: "skill", rrValue: 2, rrTarget: "athletics", rrLabel: "" }],
        },
        expected: { level: 24, cost: 10000 },
    },
    {
        name: "rigger gear, weapon-type damage bonus",
        source: {
            featType: "equipment",
            cost: "specialized-equipment",
            riggerConsoleCount: 2,
            hasVehicleControlWiring: true,
            weaponDamageBonus: 1,
            weaponTypeBonus: "smgs",
            rrList: [],
        },
        expected: { level: 5, cost: 5000 },
    },
    {
        name: "armor and knowledge costs",
        source: { featType: "armor", armorValue: 3, rating: 1, rrList: [] },
        expected: { level: 0, cost: 12500 },
    },
    {
        name: "complex form ignores rating",
        source: {
            featType: "complex-form",
            rating: 3,
            complexFormSpecializationType: "compilation",
            rrList: [],
        },
        expected: { level: 1, cost: 5000 },
    },
];

/**
 * Cost difference the new rules intentionally introduce for an old feat: the old cost priced the
 * stored rating (`COSTS.ampRating` per point, except complex forms); the new one prices the
 * computed rating.
 *
 * @param oldLevel The old system's computed level for the feat.
 */
export function intendedCostChange(
    old: Record<string, unknown> & { featType: string },
    oldLevel: number,
): number {
    if (old.featType === "complex-form") return 0;
    const rating = oldLevel + intendedRatingChange(old);
    return (rating - Number(old["rating"] ?? 0)) * COSTS.ampRating;
}

/** Old feat types whose armor value now becomes a +1 armor bonus (+1 rating; old rules ignored it). */
const ARMOR_BONUS_TYPES = new Set(["trait", "cyberware", "adept-power", "equipment"]);

/** Old threshold-bonus fields, which the new rules removed (they cost 1 level per point). */
const THRESHOLD_FIELDS = ["bonusPhysicalThreshold", "bonusMentalThreshold", "bonusMatrixThreshold"];

/** Old feat types that can still buy damage boxes (old trait = quality; bioware is cyberware). */
const BOX_TYPES = new Set(["trait", "cyberware", "adept-power", "cyberdeck"]);

/** Old feat types that can carry an initiative enhancement (old trait = quality). */
const INITIATIVE_TYPES = new Set(["trait", "cyberware", "adept-power"]);

/**
 * Difference between the new rating and the old level that the new rules intentionally introduce
 * for an old feat:
 *
 * - +1 when an armor value on a quality/cyberware/adept power/equipment becomes a +1 armor bonus;
 * - −|value| for each threshold bonus, which no longer exists;
 * - −3 per narration action (narrations no longer exist);
 * - The old edge bonus (2 levels per point) becomes initiative tier 1 (+1, 2 levels) or tier 3 (+2, 7
 *   levels) on types that can carry it, and is dropped elsewhere;
 * - −1 for an adept-power weapon flag, which no longer exists (adept powers are their own type);
 * - The value of each narrative effect without text, which the old rules ignored (the value alone
 *   counts now).
 */
export function intendedRatingChange(old: Record<string, unknown> & { featType: string }): number {
    const armor = ARMOR_BONUS_TYPES.has(old.featType) && Number(old["armorValue"] ?? 0) > 0 ? 1 : 0;
    const thresholds = THRESHOLD_FIELDS.reduce((n, k) => n + Math.abs(Number(old[k] ?? 0)), 0);
    const narrations = 3 * Number(old["narrationActions"] ?? 0);
    const edge = Number(old["bonusAnarchy"] ?? 0);
    const oldEdgeRating = 2 * edge;
    const newEdgeRating =
        INITIATIVE_TYPES.has(old.featType) && (edge === 1 || edge === 2) ? (edge === 1 ? 2 : 7) : 0;
    const adeptWeapon = old.featType === "weapon" && old["isAdeptPowerWeapon"] === true ? 1 : 0;
    const untitled = legacyNarrativeEffects(old["narrativeEffects"], 0)
        .filter((e) => String(e["text"]).trim() === "")
        .reduce((n, e) => n + Number(e["value"]), 0);
    const boxes = BOX_TYPES.has(old.featType)
        ? 0
        : 3 * Number(old["bonusLightDamage"] ?? 0) + 6 * Number(old["bonusSevereDamage"] ?? 0);
    return (
        armor -
        thresholds -
        narrations +
        newEdgeRating -
        oldEdgeRating -
        adeptWeapon +
        untitled -
        boxes
    );
}
