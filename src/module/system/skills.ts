import { COSTS, SPECIALIZATION_BONUS } from "@system/constants.ts";

/** Skill levels 1–5 cost 2.5k each; levels above 5 cost 5k each. */
export function skillCost(rating: number): number {
    const low = Math.min(rating, COSTS.skillLowLevelCap);
    const high = Math.max(0, rating - COSTS.skillLowLevelCap);
    return low * COSTS.skillLevelLow + high * COSTS.skillLevelHigh;
}

export function specializationCost(): number {
    return COSTS.specialization;
}

/** A knowledge has a flat price (it has no rating). */
export function knowledgeCost(): number {
    return COSTS.knowledge;
}

/** Dice pool for a skill roll: linked attribute + rating. */
export function skillDicePool(attributeValue: number, rating: number): number {
    return attributeValue + rating;
}

/** Dice pool for a specialization roll: its parent skill's pool + 2. */
export function specializationDicePool(attributeValue: number, skillRating: number): number {
    return skillDicePool(attributeValue, skillRating) + SPECIALIZATION_BONUS;
}

/**
 * Normalize a display name for comparison: lowercase, accents stripped, trimmed. Mirrors the
 * normalization used to build the legacy name tables.
 */
export function normalizeName(name: string): string {
    return name
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Mn}/gu, "")
        .trim();
}

/**
 * Slug for a homebrew skill or knowledge without a canonical one: its words in camelCase, so a slug
 * can be a key without quotes: "Cyber Hacking" → "cyberHacking". (Segments of a slug, like the
 * "spec_" prefix, are joined with "_".)
 */
export function slugify(name: string): string {
    return normalizeName(name)
        .split(/[^a-z0-9]+/)
        .filter(Boolean)
        .map((word, i) => (i === 0 ? word : word[0]!.toUpperCase() + word.slice(1)))
        .join("");
}

/** Slug for a homebrew specialization. Specialization slugs carry a "spec_" prefix. */
export function specializationSlugify(name: string): string {
    return `spec_${slugify(name.replace(/^sp[ée]\.?\s*:?\s*/i, ""))}`;
}
