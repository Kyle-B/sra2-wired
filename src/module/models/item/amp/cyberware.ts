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
    matrixDevice,
    type MatrixDeviceSchema,
} from "@system";

import { type AmpBaseSchema, ampFields, AmpModel } from "./base.ts";

export type CyberwareSchema = AmpBaseSchema &
    EssenceSchema &
    MatrixDeviceSchema &
    ArmorBonusSchema &
    InitiativeSchema &
    ExtraBoxesSchema;

// Schema fields are populated by DataModel at runtime; the merged interface only types them.
// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export class CyberwareModel extends AmpModel<CyberwareSchema> {
    static override readonly ampType = "cyberware";
    static override readonly kind = "gear";
    static override readonly features = [
        essence,
        matrixDevice,
        armorBonus,
        initiative,
        extraBoxesOnOwner,
    ] as const;

    static override defineSchema(): CyberwareSchema {
        return ampFields(this.features);
    }

    static override readonly effects: readonly AmpEffect<CyberwareModel>[] = [
        baseRating("cyberwareBaseRating", "cyberware", 1),
    ];
}

// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export interface CyberwareModel extends ModelPropsFromSchema<CyberwareSchema> {}
