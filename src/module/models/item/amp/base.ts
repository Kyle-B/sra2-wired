/**
 * The amp model every amp type extends, and the fields and features every amp has. Each amp type is
 * a subclass in this folder that declares its schema, features and effects together.
 */
import type { ModelPropsFromSchema } from "@common/data/fields.d.mts";
import type { SRA2Item } from "@documents/item.ts";
import { RatedModel } from "@models/rated-model.ts";
import {
    type AmpKind,
    type AmpType,
    type AnyFeature,
    COSTS,
    type Feature,
    featureFields,
    type FeaturesSchema,
    narrative,
    type NarrativeSchema,
    ratedFields,
    type RatedSchema,
    rr,
    type RRSchema,
} from "@system";
import {
    bool,
    type BoolField,
    derivedNum,
    int,
    type NumField,
    schema,
    type Schema,
} from "@system/schema/fields.ts";
import { itemBaseFields, type ItemBaseSchema } from "@system/schema/shared.ts";

/** The fields only amps have (as opposed to other rated models, like vehicles). */
type AmpCoreSchema = ItemBaseSchema &
    RatedSchema & {
        active: BoolField;
        /** Options applied when a token carrying this amp is created. */
        creation: Schema<{ optional: BoolField; isChoice: BoolField; choiceCount: NumField }>;

        // Derived (not persisted)
        /** Nuyen cost. Counted toward the owner's total only while the amp is active. */
        cost: NumField;
    };

/** Fields every amp has, whatever its type. */
export type AmpBaseSchema = AmpCoreSchema & RRSchema & NarrativeSchema;

const ampCore: Feature<AmpCoreSchema> = {
    fields: () => ({
        ...itemBaseFields(),
        ...ratedFields(),
        active: bool(true),
        creation: schema({
            optional: bool(),
            isChoice: bool(),
            choiceCount: int(1, { min: 1 }),
        }),
        cost: derivedNum(),
    }),
    effects: [],
};

/** The features every amp has, before its type's own: priced RR and narrative effects. */
export const AMP_BASE_FEATURES = [ampCore, rr, narrative] as const;

/** An amp type's fields: every amp's and those of its features. For `defineSchema()`. */
export function ampFields<const F extends readonly AnyFeature[]>(
    features: F,
): AmpBaseSchema & FeaturesSchema<F> {
    return Object.assign(
        {},
        featureFields(AMP_BASE_FEATURES),
        featureFields(features),
    ) as AmpBaseSchema & FeaturesSchema<F>;
}

/** Base model for every amp type. */
// Schema fields are populated by DataModel at runtime; the merged interface only types them.
// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export abstract class AmpModel<TSchema extends AmpBaseSchema = AmpBaseSchema> extends RatedModel<
    SRA2Item,
    TSchema
> {
    /** The Item sub-type this model is registered for. */
    declare static readonly ampType: AmpType;
    /** Whether amps of this type are traits (what their owner is) or gear (what it has). */
    declare static readonly kind: AmpKind;
    static override readonly baseFeatures: readonly AnyFeature[] = AMP_BASE_FEATURES;

    static override defineSchema(): AmpBaseSchema {
        return ampFields([]);
    }

    get ampType(): AmpType {
        return (this.constructor as typeof AmpModel).ampType;
    }

    get kind(): AmpKind {
        return (this.constructor as typeof AmpModel).kind;
    }

    /**
     * Nuyen cost: the rating's price; types add their own (a price tier, armor). Computed from the
     * stored data, so it works whether or not the amp has been prepared. Inactive amps still have a
     * cost; callers decide whether to count them.
     */
    computeCost(): number {
        return this.computeRating().rating * COSTS.ampRating;
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();
        this.cost = this.computeCost();
    }
}

// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export interface AmpModel<
    // Merging requires the class's type parameters, so `TSchema` is declared but unused here.
    // oxlint-disable-next-line no-unused-vars
    TSchema extends AmpBaseSchema = AmpBaseSchema,
> extends ModelPropsFromSchema<AmpBaseSchema> {}
