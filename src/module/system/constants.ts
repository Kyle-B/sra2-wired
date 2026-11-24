/** Game-rule constants for Shadowrun Anarchy 2. Pure data: safe to import anywhere, including tests. */

/** Maximum Risk Reduction on a single entry. */
export const RR_MAX = 3;

/** Threshold step between damage severities (light → serious → incapacitating). */
export const DAMAGE_STEP = 3;

/** Extra damage boxes, in rating: +3 per light box, +6 per serious box, for anything that buys them. */
export const DAMAGE_BOX_RATINGS = { light: 3, serious: 6 } as const;

/**
 * Damage boxes every damage track starts with (characters, vehicles, ICE, matrix devices). Light
 * and serious boxes can be bought; every track has exactly one incapacitated box, which nothing
 * changes.
 */
export const BASE_DAMAGE_BOXES = { light: 2, serious: 1, incapacitating: 1 } as const;

/** Starting edge for a character without a metatype (metatypes set their own). */
export const BASE_EDGE = 3;

/** Essence a character starts with. */
export const BASE_ESSENCE = 6;

/** Highest armor value an armor amp can have. Armor amps don't stack with each other. */
export const ARMOR_MAX = 5;

/** Highest armor value a shield can have. A shield stacks on top of worn armor. */
export const SHIELD_MAX = 1;

/** Armor added by "+1 armor" bonuses (qualities, cyberware, adept powers, equipment); never stacks. */
export const ARMOR_BONUS = 1;

/** Bonus to the effective dice pool when rolling a specialization instead of its skill. */
export const SPECIALIZATION_BONUS = 2;

/** Each risk-die success counts as this many normal successes. */
export const RISK_DICE_SUCCESS_MULTIPLIER = 2;

/** Minimum die face that counts as a success, by roll mode. */
export const SUCCESS_THRESHOLDS = { advantage: 4, normal: 5, disadvantage: 6 } as const;
export type RollMode = keyof typeof SUCCESS_THRESHOLDS;

/** Nuyen costs used by the character-cost calculation. */
export const COSTS = {
    /**
     * Per attribute level; the level equal to the metatype maximum costs `attributeMaxLevel`
     * instead.
     */
    attributeLevel: 10_000,
    attributeMaxLevel: 20_000,
    /** Skill levels 1–5. */
    skillLevelLow: 2_500,
    /** Skill levels 6+. */
    skillLevelHigh: 5_000,
    skillLowLevelCap: 5,
    specialization: 2_500,
    /** A knowledge: a flat price (it has no rating). */
    knowledge: 2_500,
    /** Per amp rating point. */
    ampRating: 5_000,
    armorPoint: 2_500,
    complexForm: 5_000,
    /** Amp cost tiers (equipment / weapon only). */
    equipmentTier: { freeEquipment: 0, equipment: 2_500, advancedEquipment: 5_000 },
    /** Vehicles: base price and price per point of rating. */
    vehicleBase: 5_000,
    vehicleRating: 5_000,
} as const;

/**
 * Initiative enhancement: rating for each tier (cumulative), and the discount per tier when limited
 * to one realm.
 */
export const INITIATIVE_TIER_RATINGS = [2, 3, 2] as const;
export const INITIATIVE_REALM_DISCOUNT = 1;
