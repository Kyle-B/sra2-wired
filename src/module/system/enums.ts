/**
 * Enumerations of the game's allowed values (actor/amp kinds and their options), as `as const`
 * arrays with derived union types rather than TS `enum`s. Pure data.
 */
import type { SpecializationSlug } from "./tables/skills.ts";

/* -------------------------------------------- */
/*  Actors                                      */
/* -------------------------------------------- */

/** Matrix connection mode of a character. */
export const CONNECTION_MODES = ["disconnected", "offline", "ar", "coldSim", "hotSim"] as const;
export type ConnectionMode = (typeof CONNECTION_MODES)[number];

export const ASTRAL_STATES = ["physical", "perception", "projection"] as const;
export type AstralState = (typeof ASTRAL_STATES)[number];

export const ICE_TYPES = [
    "patrol",
    "acid",
    "blaster",
    "jammer",
    "black",
    "tar",
    "track",
    "killer",
] as const;
export type IceType = (typeof ICE_TYPES)[number];

/** Named host security levels and the host rating each corresponds to. */
export const SERVER_LEVELS = {
    makeshift: 2,
    lowEnd: 3,
    average: 4,
    secure: 5,
    highSecurity: 6,
    extreme: 7,
} as const;
export type ServerLevel = keyof typeof SERVER_LEVELS;

/** A host's rating: what its ICE and firewall scale with. */
export const HOST_RATING_RANGE = { min: 1, max: 12 } as const;
export const DEFAULT_HOST_RATING = 4;

/* -------------------------------------------- */
/*  Amps                                        */
/* -------------------------------------------- */

/** Amp types. Each is its own Item sub-type with its own data model (and a kind: trait or gear). */
export const AMP_TYPES = [
    "quality",
    "contact",
    "awakened",
    "adeptPower",
    "equipment",
    "armor",
    "cyberware",
    "bioware",
    "cyberdeck",
    "weapon",
    "spell",
    "emerged",
    "complexForm",
    "power",
] as const;
export type AmpType = (typeof AMP_TYPES)[number];

/** Price tier for equipment and weapon amps. */
export const COST_TIERS = ["freeEquipment", "equipment", "advancedEquipment"] as const;
export type CostTier = (typeof COST_TIERS)[number];

export const RR_TYPES = ["attribute", "skill", "specialization"] as const;
export type RRType = (typeof RR_TYPES)[number];

/** Realms an initiative enhancement can be limited to. */
export const REALMS = ["physical", "astral", "virtual"] as const;
export type Realm = (typeof REALMS)[number];

/** An initiative enhancement works in every realm, or is limited to one (cheaper). */
export const INITIATIVE_REALMS = ["all", ...REALMS] as const;
export type InitiativeRealm = (typeof INITIATIVE_REALMS)[number];

export const SPELL_TYPES = ["direct", "indirect"] as const;
export type SpellType = (typeof SPELL_TYPES)[number];

/** Spell category → the specialization used to cast it (the skill is always sorcery). */
export const SPELL_SPECIALIZATIONS = {
    combat: "spec_combatSpells",
    detection: "spec_detectionSpells",
    health: "spec_healthSpells",
    illusion: "spec_illusionSpells",
    manipulation: "spec_manipulationSpells",
    counterspell: "spec_counterspelling",
} as const satisfies Record<string, SpecializationSlug>;
export type SpellCategory = keyof typeof SPELL_SPECIALIZATIONS;
export const SPELL_CATEGORIES = Object.keys(SPELL_SPECIALIZATIONS) as SpellCategory[];

/** Complex-form category → specialization used (the skill is always technomancer). */
export const COMPLEX_FORM_SPECIALIZATIONS = {
    complexForms: "spec_complexForms",
    compilation: "spec_compilation",
    decompilation: "spec_decompilation",
} as const satisfies Record<string, SpecializationSlug>;
export type ComplexFormCategory = keyof typeof COMPLEX_FORM_SPECIALIZATIONS;
export const COMPLEX_FORM_CATEGORIES = Object.keys(
    COMPLEX_FORM_SPECIALIZATIONS,
) as ComplexFormCategory[];
