import type { ModelPropsFromSchema } from "@common/data/fields.d.mts";
import {
    type AmpEffect,
    attack,
    type AttackSchema,
    COSTS,
    costTier,
    type CostTierSchema,
    flagEffect,
    perUnit,
    RANGE_BANDS,
    RANGE_USABILITY,
    type RangeBand,
    type RangeUsability,
    WEAPON_TYPE_KEYS,
    type WeaponType,
} from "@system";
import {
    bool,
    type BoolField,
    choice,
    type ChoiceField,
    schema,
    type Schema,
} from "@system/schema/fields.ts";

import { type AmpBaseSchema, ampFields, AmpModel } from "./base.ts";

export type WeaponSchema = AmpBaseSchema &
    CostTierSchema &
    AttackSchema & {
        /** Weapon preset; sets the recommended DV, ranges and skills. */
        weaponType: ChoiceField<WeaponType>;
        ranges: Schema<Record<RangeBand, ChoiceField<RangeUsability>>>;
        /** Range bands bought up one step (+2 rating each). */
        improvedRanges: Schema<Record<RangeBand, BoolField>>;
        /** Weapon focus (+1 rating). */
        isFocus: BoolField;
    };

// Schema fields are populated by DataModel at runtime; the merged interface only types them.
// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export class WeaponModel extends AmpModel<WeaponSchema> {
    static override readonly ampType = "weapon";
    static override readonly kind = "gear";
    static override readonly features = [costTier, attack] as const;

    static override defineSchema(): WeaponSchema {
        const range = () => choice(RANGE_USABILITY, "none");
        return {
            ...ampFields(this.features),
            weaponType: choice(WEAPON_TYPE_KEYS, "customWeapon"),
            ranges: schema({ close: range(), short: range(), medium: range(), long: range() }),
            improvedRanges: schema({ close: bool(), short: bool(), medium: bool(), long: bool() }),
            isFocus: bool(),
        };
    }

    static override readonly effects: readonly AmpEffect<WeaponModel>[] = [
        flagEffect<WeaponModel>({
            key: "weaponFocus",
            ratingKey: "weaponFocus",
            on: (a) => a.isFocus,
            rating: 1,
        }),
        perUnit<WeaponModel>({
            key: "rangeImprovements",
            ratingKey: "rangeImprovements",
            units: (a) => RANGE_BANDS.filter((b) => a.improvedRanges[b]).length,
            rating: 2,
        }),
    ];

    /** The rating's price plus the price tier's. */
    override computeCost(): number {
        return super.computeCost() + COSTS.equipmentTier[this.costTier];
    }
}

// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export interface WeaponModel extends ModelPropsFromSchema<WeaponSchema> {}
