/**
 * Stats and modifiers. A stat holder (a character, a vehicle, a cyberdeck) declares the stats it
 * has in a stat block; modifiers from amps (and later Active Effects) change them. Each modifier
 * says which stat it changes, by how much, and where it goes.
 */

/** Every stat any holder can have. A holder only has the ones its stat block declares. */
export const STAT_KEYS = [
    // The holder's damage track (characters, vehicles, matrix devices)
    "damageBoxes.light",
    "damageBoxes.serious",
    // Characters
    "initiative.physical",
    "initiative.astral",
    "initiative.virtual",
    "essenceLoss",
    "wornArmor",
    "shield",
    "armorBonus",
    // Matrix devices (decks, cyberware, matrix-capable equipment)
    "firewall",
    // Held by nobody yet: modifiers to these are priced but go nowhere
    "sustainedSpells",
    "summonedSpirits",
    "compiledSprites",
    "sustainedComplexForms",
    "riggerConsoles",
    "vehicleControlWiring",
    "weaponDamage",
    // Vehicles
    "autopilot",
    "speed",
    "handling",
    "armor",
    "flying",
    "fixed",
    "autopilotUnlocked",
    "additionalDrones",
] as const;
export type StatKey = (typeof STAT_KEYS)[number];

/**
 * Where a modifier goes: `self`, the thing carrying it (a deck's own firewall), or `owner`, the
 * actor that carries that thing (+1 armor from cyberware). A modifier whose target doesn't have the
 * stat goes nowhere (e.g. firewall on equipment that isn't matrix-capable).
 */
export type Target = "self" | "owner";

/** Modifiers in one stacking group add up to at most `max` (e.g. +1 armor bonuses: at most 1). */
export interface Stacking {
    group: string;
    max: number;
}

export interface Modifier {
    stat: StatKey;
    value: number;
    target: Target;
    stacking?: Stacking;
}

/**
 * How a stat's modifiers combine with its base: `sum` adds them (respecting stacking groups);
 * `best` keeps the highest of the base and the modifiers (sources don't stack).
 */
export type Combine = "sum" | "best";

export interface StatDef<THolder> {
    /** Value before modifiers: a constant or read from the holder's data. Default 0. */
    base?: number | ((holder: THolder) => number);
    /** Default `sum`. */
    combine?: Combine;
    /** The holder has this stat only when this is true (e.g. matrix stats on wireless gear). */
    when?: (holder: THolder) => boolean;
}

/** The stats a holder has. */
export type StatBlock<THolder> = { readonly [K in StatKey]?: StatDef<THolder> };
