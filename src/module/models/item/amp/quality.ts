import type { ModelPropsFromSchema } from "@common/data/fields.d.mts";
import {
    type AmpEffect,
    armorBonus,
    type ArmorBonusSchema,
    extraBoxesOnOwner,
    type ExtraBoxesSchema,
    initiative,
    type InitiativeSchema,
    spellSupport,
    type SpellSupportSchema,
} from "@system";
import { bool, type BoolField } from "@system/schema/fields.ts";

import { type AmpBaseSchema, ampFields, AmpModel } from "./base.ts";

export type QualitySchema = AmpBaseSchema &
    ArmorBonusSchema &
    SpellSupportSchema &
    InitiativeSchema &
    ExtraBoxesSchema & {
        /** A character's first quality adds no base rating. */
        isFirstQuality: BoolField;
    };

// Schema fields are populated by DataModel at runtime; the merged interface only types them.
// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export class QualityModel extends AmpModel<QualitySchema> {
    static override readonly ampType = "quality";
    static override readonly kind = "trait";
    static override readonly features = [
        armorBonus,
        spellSupport,
        initiative,
        extraBoxesOnOwner,
    ] as const;

    static override defineSchema(): QualitySchema {
        return { ...ampFields(this.features), isFirstQuality: bool() };
    }

    static override readonly effects: readonly AmpEffect<QualityModel>[] = [
        /** A quality adds 3 rating, unless it's the character's first. */
        {
            key: "qualityBaseRating",
            rating: (a) =>
                a.isFirstQuality ? [] : [{ key: "baseQuality", value: 3, count: null }],
            modifiers: () => [],
        },
    ];
}

// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export interface QualityModel extends ModelPropsFromSchema<QualitySchema> {}
