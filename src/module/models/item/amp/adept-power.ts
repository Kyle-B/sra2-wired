import type { ModelPropsFromSchema } from "@common/data/fields.d.mts";
import {
    type AmpEffect,
    armorBonus,
    type ArmorBonusSchema,
    attack,
    type AttackSchema,
    baseRating,
    extraBoxesOnOwner,
    type ExtraBoxesSchema,
    initiative,
    type InitiativeSchema,
} from "@system";

import { type AmpBaseSchema, ampFields, AmpModel } from "./base.ts";

export type AdeptPowerSchema = AmpBaseSchema &
    AttackSchema &
    ArmorBonusSchema &
    InitiativeSchema &
    ExtraBoxesSchema;

// Schema fields are populated by DataModel at runtime; the merged interface only types them.
// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export class AdeptPowerModel extends AmpModel<AdeptPowerSchema> {
    static override readonly ampType = "adeptPower";
    static override readonly kind = "trait";
    static override readonly features = [
        attack,
        armorBonus,
        initiative,
        extraBoxesOnOwner,
    ] as const;

    static override defineSchema(): AdeptPowerSchema {
        return ampFields(this.features);
    }

    static override readonly effects: readonly AmpEffect<AdeptPowerModel>[] = [
        baseRating("adeptPowerBaseRating", "adeptPower", 1),
    ];
}

// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export interface AdeptPowerModel extends ModelPropsFromSchema<AdeptPowerSchema> {}
