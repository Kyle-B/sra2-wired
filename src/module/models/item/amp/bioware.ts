import type { ModelPropsFromSchema } from "@common/data/fields.d.mts";
import {
    type AmpEffect,
    armorBonus,
    type ArmorBonusSchema,
    baseRating,
    essence,
    type EssenceSchema,
    extraBoxesOnOwner,
    type ExtraBoxesSchema,
    initiative,
    type InitiativeSchema,
} from "@system";

import { type AmpBaseSchema, ampFields, AmpModel } from "./base.ts";

export type BiowareSchema = AmpBaseSchema &
    EssenceSchema &
    ArmorBonusSchema &
    InitiativeSchema &
    ExtraBoxesSchema;

/** Bioware: like cyberware, but not networked and a base rating of 2. */
// Schema fields are populated by DataModel at runtime; the merged interface only types them.
// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export class BiowareModel extends AmpModel<BiowareSchema> {
    static override readonly ampType = "bioware";
    static override readonly kind = "trait";
    static override readonly features = [
        essence,
        armorBonus,
        initiative,
        extraBoxesOnOwner,
    ] as const;

    static override defineSchema(): BiowareSchema {
        return ampFields(this.features);
    }

    static override readonly effects: readonly AmpEffect<BiowareModel>[] = [
        baseRating("biowareBaseRating", "bioware", 2),
    ];
}

// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export interface BiowareModel extends ModelPropsFromSchema<BiowareSchema> {}
