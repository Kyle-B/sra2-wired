/**
 * Legacy import: old flat feats → per-type amps. `groupLegacyAmp` regroups the flat fields, then
 * `projectAmp` keeps the fields the target amp type has and reports the rest.
 */
import { isAttribute, AMP_TYPES, type AmpType, type DamageValue } from "@system";

import {
    type Source,
    isObject,
    num,
    text,
    camelKey,
    take,
    drop,
    into,
    legacyDamageTrack,
    resolveSkillRef,
    resolveSpecializationRef,
    retiredSkillSpecialization,
    legacyRREntries,
    legacyNarrativeEffects,
    resolveAttributeRef,
} from "./shared.ts";

/** Keys that only exist in the old sra2 flat feat shape. Their presence marks a legacy amp. */
const LEGACY_AMP_MARKERS = [
    "rrList",
    "bonusLightDamage",
    "armorValue",
    "damageValue",
    "meleeRange",
    "cyberdeckDamage",
    "isOptional",
    "spellSpecializationType",
] as const;

/** Old flat fields that have no new home. */
const DROPPED_AMP_KEYS = [
    "vehicleType",
    "vehicleActorUuid",
    "autopilot",
    "structure",
    "handling",
    "speed",
    "flyingSpeed",
    "armor",
    "weaponMount",
    "weaponInfo",
    "autopilotBonus",
    "speedBonus",
    "handlingBonus",
    "armorBonus",
    "isFixed",
    "isFlying",
    "weaponMountImprovement",
    "autopilotUnlocked",
    "additionalDroneCount",
    "connectionMode",
    "grantsNarration",
    "vdMode",
    "vdCustomValue",
    "vdAttribute",
    "vdBonus",
    "rrType",
    "rrValue",
    "rrTarget",
    // Display hint (list with spells); spells are their own type now.
    "isSpell",
] as const;

const AMP_TYPE_RENAMES: Record<string, string> = {
    connaissance: "knowledge",
    vehicle: "equipment",
    trait: "quality",
    "adept-power": "adeptPower",
    "complex-form": "complexForm",
};
/** Weapon presets renamed since the old system (after the camelCase conversion). */
const WEAPON_TYPE_RENAMES: Record<string, string> = {
    pocketPistols: "holdoutPistols",
    automaticPistols: "machinePistols",
};

/** An old weapon preset key in the current form: camelCase, and renamed if it was. */
function legacyWeaponType(v: unknown): unknown {
    const key = camelKey(v);
    return typeof key === "string" ? (WEAPON_TYPE_RENAMES[key] ?? key) : key;
}

const COST_RENAMES: Record<string, string> = {
    "specialized-equipment": "advancedEquipment",
    feat: "freeEquipment",
};
const COMPLEX_FORM_RENAMES: Record<string, string> = { "formes-complexes": "complex-forms" };

/** Old sra2 key → amp key, for keys renamed when feats became amps. Applied to all data. */
const FEAT_KEY_RENAMES = [
    ["featType", "ampType"],
    ["isFirstFeat", "isFirstAmp"],
] as const;

/**
 * The DV of an old feat. `damageValue` held a number, "toxin", or a display string for an attribute
 * plus a bonus, whose parts the old feat also kept as `vdAttribute` and `vdBonus` (`vd` is French
 * "valeur de dégâts", damage value): those are read instead of the string. Without a `damageValue`,
 * an old custom weapon's `vdMode` says which of its `vd*` values applies.
 */
function legacyDv(source: Source): DamageValue | undefined {
    const fixed = (value: number): DamageValue => ({ mode: "fixed", value, attribute: null });
    const attributePlusBonus = (): DamageValue => {
        const attribute = resolveAttributeRef(source["vdAttribute"]);
        return {
            mode: "attribute",
            value: num(source["vdBonus"]),
            attribute: isAttribute(attribute) ? attribute : null,
        };
    };
    const value = source["damageValue"];
    const raw = text(value).trim();
    if (typeof value === "number") return fixed(num(value));
    if (/^-?\d+$/.test(raw)) return fixed(Number(raw));
    if (raw.toLowerCase() === "toxin") return { mode: "toxin", value: 0, attribute: null };
    if (raw !== "") return attributePlusBonus();
    if (source["vdMode"] === "attribute") return attributePlusBonus();
    if ("vdCustomValue" in source) return fixed(num(source["vdCustomValue"]));
    return undefined;
}

/**
 * First import step for an old feat: converts the old flat shape to the grouped shape every type is
 * then projected from (see {@link migrateAmpDocument}), renaming `featType` → `ampType`. Idempotent;
 * mutates `source`.
 */
export function groupLegacyAmp(source: Source): void {
    for (const [from, to] of FEAT_KEY_RENAMES) {
        if (from in source && !(to in source)) source[to] = source[from];
        delete source[from];
    }
    if (typeof source["ampType"] === "string") {
        source["ampType"] = AMP_TYPE_RENAMES[source["ampType"]] ?? source["ampType"];
    }
    // Old `cost` held the price tier; derived `cost` is now the nuyen price.
    if (typeof source["cost"] === "string") {
        source["costTier"] = COST_RENAMES[source["cost"]] ?? camelKey(source["cost"]);
        delete source["cost"];
    }

    if (!LEGACY_AMP_MARKERS.some((key) => key in source)) return;

    // The deck's attack rating used the key the new `attack` group now occupies: move it out first.
    const deckAttack = source["attack"];
    if (!isObject(deckAttack)) delete source["attack"];

    // --- RR: oldest data used parallel arrays rrType[]/rrValue[]/rrTarget[] ---
    let rrList = source["rrList"];
    if (rrList === undefined && Array.isArray(source["rrType"])) {
        const types = source["rrType"] as unknown[];
        rrList = types.map((rrType, i) => ({
            rrType,
            rrValue: (source["rrValue"] as unknown[] | undefined)?.[i],
            rrTarget: (source["rrTarget"] as unknown[] | undefined)?.[i],
        }));
    }
    delete source["rrList"];
    if (rrList !== undefined) source["rr"] = legacyRREntries(rrList);

    if ("narrativeEffects" in source)
        source["narrativeEffects"] = legacyNarrativeEffects(source["narrativeEffects"], 0);

    into(
        source,
        "creation",
        take(source, [
            ["isOptional", "optional"],
            ["isAChoice", "isChoice"],
            ["numberOfChoice", "choiceCount"],
        ]),
    );

    // --- Bonuses ---
    const bonuses = take(source, [
        ["bonusAnarchy", "anarchy"],
        ["armorValue", "armor"],
        ["narrationActions", "narrations"],
        ["sustainedSpellCount", "sustainedSpells"],
        ["summonedSpiritCount", "summonedSpirits"],
        ["compiledSpriteCount", "compiledSprites"],
        ["sustainedComplexFormCount", "sustainedComplexForms"],
        ["riggerConsoleCount", "riggerConsoles"],
        ["hasVehicleControlWiring", "vehicleControlWiring"],
    ]);
    const boxes = take(source, [
        ["bonusLightDamage", "light"],
        ["bonusSevereDamage", "serious"],
    ]);
    if (Object.keys(boxes).length) bonuses["damageBoxes"] = boxes;
    const thresholds = take(source, [
        ["bonusPhysicalThreshold", "physical"],
        ["bonusMentalThreshold", "mental"],
        ["bonusMatrixThreshold", "matrix"],
    ]);
    if (Object.keys(thresholds).length) bonuses["thresholds"] = thresholds;
    const weaponDamage = take(source, [
        ["weaponDamageBonus", "value"],
        ["weaponTypeBonus", "weaponType"],
    ]);
    if (Object.keys(weaponDamage).length) bonuses["weaponDamage"] = weaponDamage;
    into(source, "bonuses", bonuses);

    // --- Attack profile ---
    const weaponType = text(source["weaponType"]);
    const damage = legacyDv(source);
    delete source["damageValue"];
    const attack = take(source, [
        ["damageValueBonus", "damageBonus"],
        "damageType",
        ["linkedAttackSkill", "skill"],
        ["linkedAttackSpecialization", "specialization"],
        ["linkedDefenseSkill", "defenseSkill"],
        ["linkedDefenseSpecialization", "defenseSpecialization"],
        "isMagic",
    ]);
    if (damage) attack["dv"] = damage;
    for (const [skill, specialization] of [
        ["skill", "specialization"],
        ["defenseSkill", "defenseSpecialization"],
    ] as const) {
        if (specialization in attack)
            attack[specialization] = resolveSpecializationRef(attack[specialization]);
        if (!(skill in attack)) continue;
        // A skill that is a specialization now: roll its parent skill with that specialization.
        const retired = retiredSkillSpecialization(attack[skill]);
        attack[skill] = resolveSkillRef(attack[skill]);
        if (retired && text(attack[specialization]) === "") attack[specialization] = retired;
    }
    into(source, "attack", attack);

    const weapon = take(source, [
        ["isWeaponFocus", "isFocus"],
        ["isAdeptPowerWeapon", "isAdeptPower"],
        ["rangeImprovements", "improvedRanges"],
    ]);
    // The old "melee" range band is "close" now.
    if (isObject(weapon["improvedRanges"]) && "melee" in weapon["improvedRanges"]) {
        const { melee, ...rest } = weapon["improvedRanges"];
        weapon["improvedRanges"] = { close: melee, ...rest };
    }
    delete source["weaponType"];
    weapon["type"] = weaponType === "" ? null : weaponType;
    const ranges = take(source, [
        ["meleeRange", "close"],
        ["shortRange", "short"],
        ["mediumRange", "medium"],
        ["longRange", "long"],
    ]);
    // "dice" is no longer a range usability (it was unused).
    for (const band of Object.keys(ranges)) if (ranges[band] === "dice") ranges[band] = "none";
    if (Object.keys(ranges).length) weapon["ranges"] = ranges;
    into(source, "weapon", weapon);

    into(
        source,
        "spell",
        take(source, [
            ["spellType", "type"],
            ["spellSpecializationType", "category"],
        ]),
    );

    const complexForm = take(source, [["complexFormSpecializationType", "category"]]);
    if (typeof complexForm["category"] === "string") {
        complexForm["category"] =
            COMPLEX_FORM_RENAMES[complexForm["category"]] ?? complexForm["category"];
    }
    into(source, "complexForm", complexForm);

    // --- Cyberdeck ---
    const cyberdeck = take(source, [
        "firewall",
        "firewallMalus",
        "attackMalus",
        "connectionLocked",
        ["cyberdeckBonusLightDamage", "extraLightBox"],
    ]);
    if (typeof deckAttack === "number") cyberdeck["attack"] = deckAttack;
    const programs = take(source, [
        ["cyberdeckBiofeedback", "biofeedback"],
        ["cyberdeckBiofeedbackFilter", "biofeedbackFilter"],
        ["cyberdeckConnectionLock", "lockdown"],
    ]);
    if (Object.keys(programs).length) cyberdeck["programs"] = programs;
    if ("cyberdeckDamage" in source) {
        cyberdeck["damage"] = legacyDamageTrack(source["cyberdeckDamage"]);
        delete source["cyberdeckDamage"];
    }
    into(source, "cyberdeck", cyberdeck);

    into(source, "contact", take(source, [["contactName", "name"]]));
    into(
        source,
        "awakened",
        take(source, [
            "astralPerception",
            "astralProjection",
            "sorcery",
            "conjuration",
            "adept",
            "shamanicMask",
        ]),
    );
    into(
        source,
        "emerged",
        take(source, ["matrixAccess", "complexFormWeaving", "spriteCompilation", "biofeedback"]),
    );

    drop(source, DROPPED_AMP_KEYS);
}

/* -------------------------------------------- */
/*  Amps: grouped legacy shape → per-type       */
/* -------------------------------------------- */

/** Defaults of the grouped legacy shape produced by {@link groupLegacyAmp}. */
const LEGACY_AMP_DEFAULTS: Source = {
    description: "",
    gmDescription: "",
    reference: "",
    bookmarked: false,
    ampType: "equipment",
    active: true,
    rating: 0,
    costTier: "freeEquipment",
    isFirstAmp: false,
    essenceCost: 0,
    isBioware: false,
    creation: { optional: false, isChoice: false, choiceCount: 1 },
    bonuses: {
        damageBoxes: { light: 0, serious: 0 },
        thresholds: { physical: 0, mental: 0, matrix: 0 },
        armor: 0,
        anarchy: 0,
        narrations: 0,
        sustainedSpells: 0,
        summonedSpirits: 0,
        compiledSprites: 0,
        sustainedComplexForms: 0,
        weaponDamage: { value: 0, weaponType: "custom-weapon" },
        riggerConsoles: 0,
        vehicleControlWiring: false,
    },
    rr: [],
    narrativeEffects: [],
    attack: {
        dv: { mode: "fixed", value: 0, attribute: null },
        damageBonus: 0,
        damageType: "physical",
        skill: "",
        specialization: "",
        defenseSkill: "",
        defenseSpecialization: "",
        isMagic: false,
    },
    weapon: {
        type: null,
        ranges: { close: "none", short: "none", medium: "none", long: "none" },
        improvedRanges: { close: false, short: false, medium: false, long: false },
        isFocus: false,
        isAdeptPower: false,
    },
    spell: { type: "direct", category: "combat" },
    complexForm: { category: "complex-forms" },
    cyberdeck: {
        firewall: 1,
        attack: 0,
        firewallMalus: 0,
        attackMalus: 0,
        connectionLocked: false,
        extraLightBox: false,
        programs: { biofeedback: false, biofeedbackFilter: false, lockdown: false },
        damage: { light: 0, serious: 0, incapacitating: 0 },
    },
    contact: { name: "" },
    awakened: {
        astralPerception: false,
        astralProjection: false,
        sorcery: false,
        conjuration: false,
        adept: false,
        shamanicMask: false,
    },
    emerged: {
        matrixAccess: false,
        complexFormWeaving: false,
        spriteCompilation: false,
        biofeedback: false,
    },
};

/** Copy grouped-shape path `from` to per-type path `to`, optionally transforming the value. */
type FieldMove = string | readonly [from: string, to: string, transform?: (v: unknown) => unknown];

const BASE_MOVES: FieldMove[] = [
    "description",
    "gmDescription",
    "reference",
    "bookmarked",
    "active",
    "creation",
    "rr",
    "narrativeEffects",
];
/** Bought damage boxes: only qualities, cyberware, bioware, adept powers and decks have them. */
const DAMAGE_BOXES: FieldMove[] = [["bonuses.damageBoxes", "extraDamageBoxes"]];
const COST_TIER: FieldMove[] = ["costTier"];
const ATTACK: FieldMove[] = ["attack"];
const ARMOR_BONUS: FieldMove[] = [["bonuses.armor", "armorBonus", (v) => num(v) > 0]];
const SPELL_SUPPORT: FieldMove[] = [
    ["bonuses.sustainedSpells", "sustainedSpells"],
    ["bonuses.summonedSpirits", "summonedSpirits"],
];
const flatten = (group: string, keys: readonly string[]): FieldMove[] =>
    keys.map((k) => [`${group}.${k}`, k] as const);

/**
 * Where each amp type's fields come from in the grouped legacy shape. Old non-deck feats always
 * carried `cyberdeck.firewall: 1` as a meaningless default, so firewall is only taken for decks.
 * Fields with no new home are reported when set: a weapon's adept-power flag (adept powers are
 * their own type) and a deck's firewall/attack maluses (left to Active Effects).
 */
const AMP_TYPE_MOVES: Record<AmpType, FieldMove[]> = {
    quality: [["isFirstAmp", "isFirstQuality"], ...DAMAGE_BOXES, ...ARMOR_BONUS, ...SPELL_SUPPORT],
    contact: [["contact.name", "contactName"]],
    power: [],
    equipment: [
        ...COST_TIER,
        ...ARMOR_BONUS,
        ...SPELL_SUPPORT,
        ["bonuses.riggerConsoles", "riggerConsoles"],
        ["bonuses.vehicleControlWiring", "vehicleControlWiring"],
        [
            "bonuses.weaponDamage",
            "weaponDamage",
            (v) => (isObject(v) ? { ...v, weaponType: legacyWeaponType(v["weaponType"]) } : v),
        ],
    ],
    armor: [["bonuses.armor", "armor"]],
    cyberware: ["essenceCost", ...DAMAGE_BOXES, ...ARMOR_BONUS],
    bioware: ["essenceCost", ...DAMAGE_BOXES, ...ARMOR_BONUS],
    cyberdeck: [
        ...DAMAGE_BOXES,
        ...flatten("cyberdeck", ["firewall", "programs"]),
        // The old deck damage track is the deck's own (and only) track.
        ["cyberdeck.damage", "damage"],
        ["cyberdeck.attack", "attackRating"],
        ["cyberdeck.connectionLocked", "linkLocked"],
    ],
    weapon: [
        ...COST_TIER,
        ...ATTACK,
        [
            "weapon.type",
            "weaponType",
            (v) => (typeof v === "string" && v !== "" ? legacyWeaponType(v) : "customWeapon"),
        ],
        ...flatten("weapon", ["ranges", "improvedRanges", "isFocus"]),
    ],
    spell: [...ATTACK, ["spell.type", "spellType"], ["spell.category", "category"]],
    complexForm: [...ATTACK, ["complexForm.category", "category", camelKey]],
    adeptPower: [...ATTACK, ...DAMAGE_BOXES, ...ARMOR_BONUS],
    awakened: flatten("awakened", [
        "astralPerception",
        "astralProjection",
        "sorcery",
        "conjuration",
        "adept",
        "shamanicMask",
    ]),
    emerged: [
        ...flatten("emerged", [
            "matrixAccess",
            "complexFormWeaving",
            "spriteCompilation",
            "biofeedback",
        ]),
        ["bonuses.compiledSprites", "compiledSprites"],
        ["bonuses.sustainedComplexForms", "sustainedComplexForms"],
    ],
};

/**
 * Grouped-shape fields that are dropped without being reported: fields that never had any effect on
 * types without them (old data sets a price tier on most feats, but only equipment and weapon costs
 * ever read it), and fields the new rules replace.
 */
const INERT_LEGACY_AMP_FIELDS = [
    "costTier",
    // Superseded: an amp's rating (and so its cost) is always computed from its effects now.
    "rating",
    // Consumed by choosing the type: bioware feats become the bioware type.
    "isBioware",
];

/** Amp types that can carry an initiative enhancement. */
const INITIATIVE_CARRIERS: ReadonlySet<AmpType> = new Set([
    "quality",
    "cyberware",
    "bioware",
    "adeptPower",
]);

/** What an old feat becomes: an amp of one of the amp types, or a knowledge (no longer an amp). */
export type FeatItemType = AmpType | "knowledge";

const isFeatItemType = (v: unknown): v is FeatItemType =>
    v === "knowledge" || (typeof v === "string" && (AMP_TYPES as readonly string[]).includes(v));

/** A knowledge keeps only the description fields; its old rating and amp fields are dropped. */
const KNOWLEDGE_MOVES: FieldMove[] = ["description", "gmDescription", "reference", "bookmarked"];

/** Deep-merge plain objects; arrays and primitives in `patch` replace. Unknown keys are dropped. */
function mergeDefaults<T>(base: T, patch: unknown): T {
    if (!isObject(base) || !isObject(patch)) return (patch === undefined ? base : patch) as T;
    const out: Source = { ...base };
    for (const [key, value] of Object.entries(patch)) {
        if (key in out) out[key] = mergeDefaults(out[key], value);
    }
    return out as T;
}

function getPath(obj: unknown, path: string): unknown {
    return path.split(".").reduce<unknown>((o, k) => (isObject(o) ? o[k] : undefined), obj);
}

function setPath(obj: Source, path: string, value: unknown): void {
    const keys = path.split(".");
    const last = keys.pop()!;
    let target = obj;
    for (const key of keys) target = isObject(target[key]) ? target[key] : (target[key] = {});
    target[last] = value;
}

/** Leaf paths of a plain-object tree (arrays count as leaves). */
function leafPaths(obj: Source, prefix = ""): string[] {
    return Object.entries(obj).flatMap(([key, value]) =>
        isObject(value) ? leafPaths(value, `${prefix}${key}.`) : [`${prefix}${key}`],
    );
}

/**
 * Project grouped-shape feat data onto one amp type's schema, or a knowledge's. Returns the new
 * system data and the grouped paths that held non-default values the type has no field for.
 */
function projectAmp(type: FeatItemType, grouped: Source): { system: Source; dropped: string[] } {
    const full = mergeDefaults(LEGACY_AMP_DEFAULTS, grouped);
    const system: Source = {};
    const used: string[] = ["ampType", ...INERT_LEGACY_AMP_FIELDS];
    const moves = type === "knowledge" ? KNOWLEDGE_MOVES : [...BASE_MOVES, ...AMP_TYPE_MOVES[type]];
    for (const move of moves) {
        const [from, to, transform] = typeof move === "string" ? [move, move] : move;
        const value = structuredClone(getPath(full, from));
        setPath(system, to, transform ? transform(value) : value);
        used.push(from);
    }
    // The old edge (anarchy) bonus was a stand-in for initiative enhancement: +1 → tier 1 and
    // +2 → tier 3, on the types that can carry it. Other values, or other types, are dropped.
    const anarchy = num(getPath(full, "bonuses.anarchy"));
    if (type !== "knowledge" && INITIATIVE_CARRIERS.has(type) && (anarchy === 1 || anarchy === 2)) {
        setPath(system, "initiativeEnhancement", anarchy === 1 ? 1 : 3);
        used.push("bonuses.anarchy");
    }
    // An old deck's extra light box is now simply +1 light box on the deck (same +3 levels).
    if (type === "cyberdeck") {
        if (getPath(full, "cyberdeck.extraLightBox") === true) {
            const light = getPath(system, "extraDamageBoxes.light");
            setPath(system, "extraDamageBoxes.light", num(light) + 1);
        }
        used.push("cyberdeck.extraLightBox");
    }
    const covered = (path: string) => used.some((u) => path === u || path.startsWith(`${u}.`));
    const dropped = leafPaths(full).filter(
        (path) =>
            !covered(path) &&
            JSON.stringify(getPath(full, path)) !==
                JSON.stringify(getPath(LEGACY_AMP_DEFAULTS, path)),
    );
    return { system, dropped };
}

/**
 * The item type an old feat's system data becomes, without changing it: its `featType` (renamed:
 * trait → quality, connaissance → knowledge, vehicle → equipment), or bioware for cyberware flagged
 * as bioware. Unknown types become equipment.
 */
export function legacyFeatType(system: Source): FeatItemType {
    const raw = text(system["featType"] ?? system["ampType"]);
    const renamed = AMP_TYPE_RENAMES[raw] ?? raw;
    const type: FeatItemType = isFeatItemType(renamed) ? renamed : "equipment";
    return type === "cyberware" && system["isBioware"] === true ? "bioware" : type;
}

/**
 * Convert an old feat item source into its per-type amp sub-type (or a knowledge), in place. Fields
 * the target type has no place for are dropped and logged by item name.
 */
export function migrateAmpDocument(
    source: Source,
    warn: (message: string) => void = console.warn,
): string[] {
    const grouped = isObject(source["system"]) ? source["system"] : {};
    const type = legacyFeatType(grouped);
    groupLegacyAmp(grouped);
    const { system, dropped } = projectAmp(type, grouped);
    source["type"] = type;
    source["system"] = system;
    if (dropped.length) {
        warn(
            `sra2-wired | Imported "${text(source["name"], "?")}" as ${type}; dropped fields it has no place for: ${dropped.join(", ")}`,
        );
    }
    return dropped;
}
