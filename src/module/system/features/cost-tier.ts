import { COST_TIERS, type CostTier } from "../enums.ts";
import { choice, type ChoiceField } from "../schema/fields.ts";
import type { Feature } from "./feature.ts";

export type CostTierSchema = {
    /** Price tier. */
    costTier: ChoiceField<CostTier>;
};

/** A price tier: equipment, weapons. Priced in nuyen (their models' `computeCost`), not in rating. */
export const costTier: Feature<CostTierSchema> = {
    fields: () => ({ costTier: choice(COST_TIERS, "freeEquipment") }),
    effects: [],
};
