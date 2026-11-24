/**
 * Helpers and conversions shared by the legacy import shims: coercion, damage tracks, skill and
 * specialization references, RR entries and narrative effects.
 */
import {
    type Attribute,
    isAttribute,
    normalizeName,
    slugify,
    specializationSlugify,
    LEGACY_SKILL_NAMES,
    LEGACY_SPECIALIZATION_NAMES,
    SKILLS,
    SPECIALIZATIONS,
} from "@system";

export type Source = Record<string, unknown>;

/* -------------------------------------------- */
/*  Small coercion helpers                      */
/* -------------------------------------------- */

export const isObject = (v: unknown): v is Source =>
    typeof v === "object" && v !== null && !Array.isArray(v);
export const num = (v: unknown, fallback = 0): number =>
    typeof v === "number" && Number.isFinite(v) ? v : fallback;
export const text = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);
export const flag = (v: unknown): boolean => v === true;

/**
 * An old kebab-case choice key in current camelCase, e.g. `heavy-pistols` → `heavyPistols`. Current
 * keys and non-strings pass through, so it is safe to apply more than once.
 */
export const camelKey = <T>(v: T): T | string =>
    typeof v === "string" ? v.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()) : v;

/**
 * Move `keys` out of `source` into a new object (renaming via [from, to] pairs). Missing keys are
 * skipped.
 */
export function take(
    source: Source,
    mapping: readonly (string | readonly [from: string, to: string])[],
): Source {
    const out: Source = {};
    for (const entry of mapping) {
        const [from, to] = typeof entry === "string" ? [entry, entry] : entry;
        if (from in source) {
            out[to] = source[from];
            delete source[from];
        }
    }
    return out;
}

export function drop(source: Source, keys: readonly string[]): void {
    for (const key of keys) delete source[key];
}

/** Merge `values` into the object at `source[key]` (creating it), without overwriting existing keys. */
export function into(source: Source, key: string, values: Source): void {
    if (Object.keys(values).length === 0) return;
    const existing = isObject(source[key]) ? source[key] : {};
    source[key] = { ...values, ...existing };
}

/* -------------------------------------------- */
/*  Shared conversions                          */
/* -------------------------------------------- */

/**
 * Old damage tracks were boolean arrays with "severe" boxes and an incapacitated flag; tracks now
 * store filled counts of light, serious and incapacitated boxes. Current-shape tracks pass
 * through.
 */
export function legacyDamageTrack(value: unknown): {
    light: number;
    serious: number;
    incapacitating: number;
} {
    const v = isObject(value) ? value : {};
    const count = (x: unknown) =>
        Array.isArray(x) ? x.filter((b) => b === true).length : Math.max(0, num(x));
    const incapacitating = v["incapacitating"];
    return {
        light: count(v["light"]),
        serious: count(v["serious"] ?? v["severe"]),
        incapacitating: Math.min(
            1,
            typeof incapacitating === "boolean" ? Number(incapacitating) : count(incapacitating),
        ),
    };
}

/** A track in an old shape: box arrays, "severe" boxes or an incapacitated flag. */
export const isLegacyTrack = (v: unknown) =>
    isObject(v) &&
    (Array.isArray(v["light"]) || "severe" in v || typeof v["incapacitating"] === "boolean");

export const countTrue = (v: unknown): number =>
    Array.isArray(v) ? v.filter((b) => b === true).length : num(v);

/** A current skill slug: camelCase words, e.g. `closeCombat`. */
const CAMEL_SLUG = /^[a-z][a-zA-Z0-9]*$/;
/** An old kebab-case skill slug, e.g. `close-combat`. */
const KEBAB_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)+$/;

/**
 * An old kebab-case slug in the current format: words in camelCase, segments still joined with "_"
 * (`spec_flying-drones` → `spec_flyingDrones`). Current slugs pass through unchanged, so it is safe
 * to apply more than once.
 */
export function legacySlug(slug: string): string {
    return slug
        .split("_")
        .map((segment) => segment.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase()))
        .join("_");
}

/**
 * Resolve a skill reference to a slug: a known EN/FR display name, an old kebab-case slug, or a
 * current slug (kept). Names are checked first: a one-word name like "hacking" looks like a slug. A
 * skill that is now a specialization resolves to its parent skill; use
 * {@link retiredSkillSpecialization} where the reference can become the specialization instead.
 */
export function resolveSkillRef(ref: unknown): string {
    const slug = skillRef(ref);
    return RETIRED_SKILLS[slug]?.skill ?? slug;
}

/**
 * The specialization a skill reference now means, for skills the old packs had that are
 * specializations now (astral combat → `spec_astralCombat`); null for any other reference.
 */
export function retiredSkillSpecialization(ref: unknown): string | null {
    return RETIRED_SKILLS[skillRef(ref)]?.specialization ?? null;
}

/** Skills the old packs had that are specializations now, by their old slug. */
const RETIRED_SKILLS: Readonly<Record<string, { skill: string; specialization: string }>> = {
    astralCombat: { skill: "closeCombat", specialization: "spec_astralCombat" },
};

/** Normalized EN/FR names of the retired skills → their old slug. */
const RETIRED_SKILL_NAMES: Readonly<Record<string, string>> = {
    "astral combat": "astralCombat",
    "combat astral": "astralCombat",
};

function skillRef(ref: unknown): string {
    const value = text(ref).trim();
    if (value === "" || value in SKILLS) return value;
    const normalized = normalizeName(value);
    const named = RETIRED_SKILL_NAMES[normalized] ?? LEGACY_SKILL_NAMES[normalized];
    if (named) return named;
    if (KEBAB_SLUG.test(value)) return legacySlug(value);
    if (CAMEL_SLUG.test(value)) return value;
    return slugify(value);
}

/** Resolve a specialization reference (display name or slug) to a slug. */
export function resolveSpecializationRef(ref: unknown): string {
    const value = text(ref).trim();
    if (value === "" || value in SPECIALIZATIONS) return value;
    const renamed = OLD_SPECIALIZATION_SLUGS[value];
    if (renamed) return renamed;
    if (value.startsWith("spec_")) return legacySlug(value);
    return LEGACY_SPECIALIZATION_NAMES[normalizeName(value)] ?? specializationSlugify(value);
}

/**
 * Old-pack specialization slugs (as the old packs wrote them) that are renamed or folded into
 * another now. Keyed by the old spelling, never a current slug: some renames swap names (personal
 * devices → personal electronics, personal electronics → electronics B&R), so current data must not
 * be mapped again.
 */
const OLD_SPECIALIZATION_SLUGS: Readonly<Record<string, string>> = {
    "spec_animal-training": "spec_animals",
    "spec_aquatic-drones": "spec_waterDrones",
    "spec_aquatic-vehicles": "spec_waterVehicles",
    "spec_astral-stealth": "spec_astralSneaking",
    "spec_blunt-weapons": "spec_clubs",
    "spec_cr-drones": "spec_brDrones",
    "spec_cr-mechanical-devices": "spec_brMechanical",
    "spec_cr-vehicles": "spec_brVehicles",
    spec_cybernetics: "spec_brCybernetics",
    spec_explosives: "spec_demolitions",
    spec_fangs: "spec_bite",
    "spec_la-rue": "spec_street",
    "spec_matrix-stealth": "spec_matrixSneaking",
    "spec_personal-devices": "spec_personalElectronics",
    "spec_personal-electronics": "spec_brElectronics",
    spec_physical: "spec_physicalPerception",
    "spec_physical-stealth": "spec_physicalSneaking",
    spec_shotguns: "spec_rifles",
    spec_stealth: "spec_palming",
    "spec_thrown-weapons": "spec_throwingWeapons",
    "spec_wilderness-survival": "spec_wilderness",
};

/** Normalized FR attribute names (and the FR strength abbreviation) → attribute. */
const LEGACY_ATTRIBUTE_NAMES: Record<string, Attribute> = {
    force: "strength",
    agilite: "agility",
    volonte: "willpower",
    logique: "logic",
    charisme: "charisma",
    for: "strength",
};

export function resolveAttributeRef(ref: unknown): string {
    const value = text(ref).trim();
    if (isAttribute(value)) return value;
    const normalized = normalizeName(value);
    return isAttribute(normalized) ? normalized : (LEGACY_ATTRIBUTE_NAMES[normalized] ?? value);
}

/** Old RR entries: { rrType, rrValue, rrTarget, rrLabel }. */
export function legacyRREntries(list: unknown): Source[] {
    if (!Array.isArray(list)) return [];
    return list.filter(isObject).map((rr) => {
        let type = text(rr["rrType"] ?? rr["type"], "skill");
        const rawTarget = rr["rrTarget"] ?? rr["target"];
        // RR on a skill that is a specialization now becomes RR on that specialization.
        const retired = type === "skill" ? retiredSkillSpecialization(rawTarget) : null;
        if (retired) type = "specialization";
        let target: string;
        if (retired) target = retired;
        else if (type === "attribute") target = resolveAttributeRef(rawTarget);
        else if (type === "specialization") target = resolveSpecializationRef(rawTarget);
        else target = resolveSkillRef(rawTarget);
        return {
            type,
            target,
            value: num(rr["rrValue"] ?? rr["value"], 1),
            label: text(rr["rrLabel"] ?? rr["label"]),
        };
    });
}

/**
 * Old narrative effects were `{ text, isNegative, value }` (or, earlier, bare strings). The sign of
 * `value` is now the only polarity marker. `stringValue` is the value given to bare-string
 * effects.
 */
export function legacyNarrativeEffects(list: unknown, stringValue: number): Source[] {
    if (!Array.isArray(list)) return [];
    return list.flatMap((e): Source[] => {
        if (typeof e === "string") return e.trim() ? [{ text: e, value: stringValue }] : [];
        if (!isObject(e)) return [];
        const value = num(e["value"]);
        const negative = flag(e["isNegative"]);
        return [{ text: text(e["text"]), value: negative && value > 0 ? -value : value }];
    });
}

export const isUuidLike = (v: unknown): v is string =>
    typeof v === "string" && /^[A-Za-z]+\.[A-Za-z0-9.]+$/.test(v);
