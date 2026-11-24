/**
 * Rating: what a model's effects add up to. Each effect prices itself as rating entries, which make
 * up the model's rating and its breakdown.
 */
import type { ModelPropsFromSchema } from "@common/data/fields.d.mts";

import {
    type ArrayOf,
    type ChoiceField,
    derivedArray,
    derivedChoice,
    derivedNullableNum,
    derivedNum,
    derivedSchema,
    type NullableNumField,
    type NumField,
    type Schema,
} from "../schema/fields.ts";

/** Every rule that can contribute to a rating. */
export const RATING_KEYS = [
    "baseQuality",
    "cyberware",
    "bioware",
    "adeptPower",
    "spell",
    "complexForm",
    "lightBoxes",
    "seriousBoxes",
    "armorBonus",
    "firewall",
    "cyberdeckBiofeedback",
    "cyberdeckBiofeedbackFilter",
    "cyberdeckLockdown",
    "attackRating",
    "riggerConsoles",
    "vehicleControlWiring",
    "weaponFocus",
    "damageBonus",
    "weaponDamageBonus",
    "rangeImprovements",
    "rrSpecialization",
    "rrSkill",
    "rrAttribute",
    "initiativeEnhancement",
    "narrativeEffectsPositive",
    "narrativeEffectsNegative",
    "sustainedSpells",
    "summonedSpirits",
    "astralPerception",
    "astralPerceptionProjection",
    "sorcery",
    "conjuration",
    "adept",
    "matrixAccess",
    "complexFormWeaving",
    "spriteCompilation",
    "emergedBiofeedback",
    "compiledSprites",
    "sustainedComplexForms",
    "shamanicMask",
    // Vehicles
    "autopilotUpgrade",
    "speedUpgrade",
    "handlingUpgrade",
    "armorUpgrade",
    "flying",
    "fixed",
    "autopilotUnlocked",
    "additionalDrones",
    "extraMounts",
    "mountCosts",
] as const;
export type RatingKey = (typeof RATING_KEYS)[number];

/** One line of a rating breakdown. `key` identifies the rule; UI maps it to a label. */
export type RatingEntrySchema = {
    key: ChoiceField<RatingKey>;
    value: NumField;
    /** Quantity the rule was multiplied by (e.g. ammount of firewall); null when not meaningful. */
    count: NullableNumField;
};

export type RatingEntry = ModelPropsFromSchema<RatingEntrySchema>;

/** The derived rating fields of anything that carries effects (amps, vehicles). */
export type RatedSchema = {
    /** The model's rating: what its effects add up to. Always computed, never stored. */
    rating: NumField;
    /** Where the rating comes from, one entry per contributing rule. */
    ratingBreakdown: ArrayOf<Schema<RatingEntrySchema>>;
};

export function ratedFields(): RatedSchema {
    return {
        rating: derivedNum(),
        ratingBreakdown: derivedArray(
            derivedSchema({
                key: derivedChoice(RATING_KEYS, "baseQuality"),
                value: derivedNum(),
                count: derivedNullableNum(),
            }),
        ),
    };
}
