/** Legacy import: skill, specialization and metatype system data. */
import { ATTRIBUTES, BASE_EDGE, isAttribute, SKILLS, SPECIALIZATIONS } from "@system";

import {
    into,
    num,
    resolveAttributeRef,
    resolveSkillRef,
    resolveSpecializationRef,
    type Source,
    take,
    text,
} from "./shared.ts";

/* -------------------------------------------- */
/*  Items                                       */
/* -------------------------------------------- */

/** The attributes a canonical skill or specialization can be rolled with, by its slug. */
function canonicalAttributes(
    type: "skill" | "specialization",
    slug: string,
): readonly string[] | undefined {
    if (slug === "") return undefined;
    return type === "skill"
        ? SKILLS[resolveSkillRef(slug) as keyof typeof SKILLS]?.attributes
        : SPECIALIZATIONS[resolveSpecializationRef(slug) as keyof typeof SPECIALIZATIONS]
              ?.attributes;
}

/**
 * An old skill or specialization was linked to one attribute; it now lists the attributes it can be
 * rolled with: a canonical one's from the table, otherwise its old one.
 *
 * Runs from both the system data model's shim and the document's, whichever runs first: the
 * document's knows the item's name, so it can tell a canonical item without a slug. Without a slug,
 * the old `linkedAttribute` is left in place (with the old one as a fallback list) for the
 * document's shim to finish. Current data has no `linkedAttribute`, so it is never touched.
 */
export function upgradeLinkedAttribute(
    system: Source,
    type: "skill" | "specialization",
    slug: string,
): void {
    if (!("linkedAttribute" in system)) return;
    const canonical = canonicalAttributes(type, slug);
    const attribute = resolveAttributeRef(system["linkedAttribute"]);
    if (canonical) system["linkedAttributes"] = [...canonical];
    else if (isAttribute(attribute)) system["linkedAttributes"] = [attribute];
    if (slug !== "") delete system["linkedAttribute"];
}

export function migrateSkill(source: Source): void {
    upgradeLinkedAttribute(source, "skill", text(source["slug"]).trim());
}

export function migrateSpecialization(source: Source): void {
    upgradeLinkedAttribute(source, "specialization", text(source["slug"]).trim());
    if (typeof source["linkedSkill"] === "string")
        source["linkedSkill"] = resolveSkillRef(source["linkedSkill"]);
}

const METATYPE_MAX_KEYS = ATTRIBUTES.map(
    (a) => [`max${a[0]!.toUpperCase()}${a.slice(1)}`, a] as const,
);

export function migrateMetatype(source: Source): void {
    if ("maxStrength" in source) into(source, "maxAttributes", take(source, METATYPE_MAX_KEYS));
    // Anarchy was 3 + a metatype bonus; the metatype now sets the starting edge directly.
    if ("anarchyBonus" in source) {
        source["edge"] = BASE_EDGE + num(source["anarchyBonus"]);
        delete source["anarchyBonus"];
    }
}
