/**
 * Legacy import at the document level, where the item type and name are available: old feats become
 * their amp type, old item types are renamed, slugs are filled and the broken archery item is
 * repaired.
 */
import { normalizeName, slugify, SPECIALIZATIONS } from "@system";

import { legacyFeatType, migrateAmpDocument } from "./amps.ts";
import { upgradeLinkedAttribute } from "./items.ts";
import {
    type Source,
    isObject,
    legacySlug,
    num,
    text,
    resolveSkillRef,
    resolveSpecializationRef,
    retiredSkillSpecialization,
} from "./shared.ts";

/* -------------------------------------------- */
/*  Document-level                              */
/* -------------------------------------------- */

/**
 * The item type a source will have once imported, without changing it: e.g. an old `feat` becomes
 * its amp type, `race` becomes `metatype` and the old Astral Combat skill a specialization. Current
 * types are returned as they are.
 */
export function legacyItemType(source: Source): string {
    if (source["type"] === "race") return "metatype";
    if (isOldAstralCombatSkill(source)) return "specialization";
    if (source["type"] === "feat")
        return legacyFeatType(isObject(source["system"]) ? source["system"] : {});
    return text(source["type"]);
}

/**
 * Document-level item shim: renames the legacy "race" type to "metatype", puts old kebab-case slugs
 * of skills/specializations/knowledges in the current format, and gives those without a slug one
 * derived from their name (canonical when a skill's or specialization's name is a known EN/FR
 * name). Runs on whole item sources.
 */
export function migrateItemDocument(
    source: Source,
    warn: (message: string) => void = console.warn,
): void {
    if (source["type"] === "race") source["type"] = "metatype";
    // Old feats become one of the per-type amp sub-types.
    if (source["type"] === "feat") migrateAmpDocument(source, warn);
    if (isOldAstralCombatSkill(source)) astralCombatToSpecialization(source, warn);
    const system = source["system"];
    if (!isObject(system)) return;
    const slug = text(system["slug"]).trim();
    if (slug !== "") {
        if (source["type"] === "skill") system["slug"] = resolveSkillRef(slug);
        else if (source["type"] === "specialization")
            system["slug"] = resolveSpecializationRef(slug);
        else if (source["type"] === "knowledge") system["slug"] = legacySlug(slug);
    }
    fixArcherySpecialization(source);
    fillSlugFromName(source, system);
    // An old item's single attribute becomes its list (the table's, for a canonical item).
    if (source["type"] === "skill" || source["type"] === "specialization")
        upgradeLinkedAttribute(system, source["type"], text(system["slug"]).trim());
}

/** Give a skill, specialization or knowledge without a slug one derived from its name. */
function fillSlugFromName(source: Source, system: Source): void {
    if (text(system["slug"]).trim() !== "" || typeof source["name"] !== "string") return;
    if (source["type"] === "skill") system["slug"] = resolveSkillRef(source["name"]);
    else if (source["type"] === "specialization")
        system["slug"] = resolveSpecializationRef(source["name"]);
    else if (source["type"] === "knowledge") system["slug"] = slugify(source["name"]);
}

/** Document-level actor shim: applies {@link migrateItemDocument} to embedded items. */
export function migrateActorDocument(source: Source): void {
    if (Array.isArray(source["items"]))
        for (const item of source["items"]) if (isObject(item)) migrateItemDocument(item);
}

/* -------------------------------------------- */
/*  Astral combat                               */
/* -------------------------------------------- */

const ASTRAL_COMBAT = "spec_astralCombat";

/** The old packs' Astral Combat skill, by its slug, or by its EN/FR name when it has none. */
function isOldAstralCombatSkill(source: Source): boolean {
    const system = source["system"];
    if (source["type"] !== "skill" || !isObject(system)) return false;
    const slug = text(system["slug"]).trim();
    return retiredSkillSpecialization(slug !== "" ? slug : source["name"]) === ASTRAL_COMBAT;
}

/**
 * Astral combat is a close combat specialization now, not a skill: turn the old skill item into the
 * specialization, keeping its name and description fields. Its rating has no place on a
 * specialization, so it is dropped and reported.
 */
function astralCombatToSpecialization(source: Source, warn: (message: string) => void): void {
    const old = source["system"] as Source;
    const system: Source = {};
    for (const key of ["description", "gmDescription", "reference", "bookmarked"])
        if (key in old) system[key] = old[key];
    const spec = SPECIALIZATIONS[ASTRAL_COMBAT];
    Object.assign(system, {
        linkedSkill: spec.skill,
        linkedAttributes: [...spec.attributes],
        slug: ASTRAL_COMBAT,
    });
    source["type"] = "specialization";
    source["system"] = system;
    const rating = num(old["rating"]);
    if (rating > 0) {
        warn(
            `sra2-wired | Imported the "${text(source["name"], "?")}" skill as the ${ASTRAL_COMBAT} specialization; dropped its rating (${rating})`,
        );
    }
}

/* -------------------------------------------- */
/*  Archery                                     */
/* -------------------------------------------- */

/** Pack id of the old archery specialization, which both old packs shipped broken. */
const OLD_ARCHERY_ID = "XuqwhPGWShDDl7gk";
const OLD_ARCHERY_EN_NAME = "Spec: Thrown Weapons";

/**
 * The old packs' archery item was slugged `spec_heavy-weapons` in FR ("Spé : Armes de trait") and
 * named "Spec: Thrown Weapons" (with the thrown-weapons slug) in EN. Re-slug copies of it to
 * `spec_archery`, identified by the FR name or by the pack id (the item's own `_id`, or its
 * compendium source).
 */
function fixArcherySpecialization(source: Source): void {
    if (source["type"] !== "specialization") return;
    const system = source["system"];
    if (!isObject(system) || system["slug"] === "spec_archery") return;
    const stats = isObject(source["_stats"]) ? source["_stats"] : {};
    const fromPack =
        source["_id"] === OLD_ARCHERY_ID ||
        text(stats["compendiumSource"]).endsWith(`.${OLD_ARCHERY_ID}`);
    const frName = normalizeName(text(source["name"])) === "spe : armes de trait";
    if (!fromPack && !frName) return;
    system["slug"] = "spec_archery";
    if (source["name"] === OLD_ARCHERY_EN_NAME) source["name"] = "Spec: Archery";
}
