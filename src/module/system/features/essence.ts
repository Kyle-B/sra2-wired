import { num, type NumField } from "../schema/fields.ts";
import type { Feature } from "./feature.ts";

export type EssenceSchema = {
    /** Essence the augmentation costs its owner. */
    essenceCost: NumField;
};

/** An augmentation's essence cost: cyberware, bioware. No rating cost. */
export const essence: Feature<EssenceSchema> = {
    fields: () => ({ essenceCost: num(0, { min: 0 }) }),
    effects: [
        {
            key: "essence",
            rating: () => [],
            modifiers: (a) =>
                a.essenceCost
                    ? [{ stat: "essenceLoss", value: a.essenceCost, target: "owner" }]
                    : [],
        },
    ],
};
