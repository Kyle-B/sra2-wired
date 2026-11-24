import type { ModelPropsFromSchema } from "@common/data/fields.d.mts";

import { ARMOR_BONUS } from "../constants.ts";
import { flagEffect } from "../effects/amp-effect.ts";
import { bool, type BoolField } from "../schema/fields.ts";
import type { Feature } from "./feature.ts";

export type ArmorBonusSchema = {
    /** +1 armor (+1 rating). Stacks with armor amps, but not with other +1 armor bonuses. */
    armorBonus: BoolField;
};

/** +1 armor: +1 rating each, but a character receives at most +1 however many it has. */
const armorBonusEffect = flagEffect<ModelPropsFromSchema<ArmorBonusSchema>>({
    key: "armorBonus",
    ratingKey: "armorBonus",
    on: (a) => a.armorBonus,
    rating: 1,
    stat: "armorBonus",
    value: ARMOR_BONUS,
    stacking: { group: "armorBonus", max: ARMOR_BONUS },
});

/** +1 armor: qualities, cyberware, bioware, adept powers, equipment. */
export const armorBonus: Feature<ArmorBonusSchema> = {
    fields: () => ({ armorBonus: bool() }),
    effects: [armorBonusEffect],
};
