import type { ModelPropsFromSchema } from "@common/data/fields.d.mts";
import type { SRA2Actor } from "@documents/actor.ts";
import { migrateIce } from "@migration/legacy/index.ts";
import { SystemModel } from "@models/base.ts";
import {
    BASE_DAMAGE_BOXES,
    DAMAGE_TYPES,
    type DamageType,
    DEFAULT_HOST_RATING,
    HOST_RATING_RANGE,
    ICE_ATTACKS,
    ICE_FIREWALL,
    ICE_TYPES,
    type IceType,
    multipliedThresholds,
} from "@system";
import {
    derivedNullableChoice,
    derivedNullableNum,
    derivedNum,
    int,
    nullableChoice,
    type NullableChoiceField,
    type NullableNumField,
    type NumField,
    type Schema,
} from "@system/schema/fields.ts";
import {
    damageTrack,
    type DamageBoxesSchema,
    type DamageTrackSchema,
    derivedDamageBoxes,
    derivedThresholds,
    descriptionFields,
    type DescriptionSchema,
    type ThresholdsSchema,
} from "@system/schema/shared.ts";

export type IceSchema = DescriptionSchema & {
    /** Null when not chosen yet. */
    iceType: NullableChoiceField<IceType>;
    /** The rating of the host the ICE guards. */
    hostRating: NumField;
    damage: Schema<DamageTrackSchema>;

    // Derived (not persisted), from its type and host rating
    /** ICE always have firewall 1. */
    firewall: NumField;
    /** Successes needed to beat the ICE: the host rating. */
    threshold: NumField;
    thresholds: Schema<ThresholdsSchema>;
    /** DV of the ICE's attack; null for ICE that deal no damage. */
    dv: NullableNumField;
    /** Type of damage the ICE's attack deals; null for ICE that deal no damage. */
    damageType: NullableChoiceField<DamageType>;
    damageBoxes: Schema<DamageBoxesSchema>;
};

// Schema fields are populated by DataModel at runtime; the merged interface only types them.
// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export class IceModel extends SystemModel<SRA2Actor, IceSchema> {
    static override defineSchema(): IceSchema {
        return {
            ...descriptionFields(),
            iceType: nullableChoice(ICE_TYPES),
            hostRating: int(DEFAULT_HOST_RATING, HOST_RATING_RANGE),
            damage: damageTrack(),
            firewall: derivedNum(),
            threshold: derivedNum(),
            thresholds: derivedThresholds(),
            dv: derivedNullableNum(),
            damageType: derivedNullableChoice(DAMAGE_TYPES),
            damageBoxes: derivedDamageBoxes(),
        };
    }

    static override migrateData(source: Record<string, unknown>): Record<string, unknown> {
        migrateIce(source);
        return super.migrateData(source);
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();
        const attack = this.iceType ? ICE_ATTACKS[this.iceType] : undefined;
        this.firewall = ICE_FIREWALL;
        this.threshold = this.hostRating;
        this.thresholds = multipliedThresholds(ICE_FIREWALL);
        this.dv = attack ? attack.dv(this.hostRating) : null;
        this.damageType = attack?.damageType ?? null;
        this.damageBoxes = { ...BASE_DAMAGE_BOXES };
    }
}

// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export interface IceModel extends ModelPropsFromSchema<IceSchema> {}
