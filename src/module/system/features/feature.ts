/**
 * Features: sets of fields several models share, with the effects (rating price and modifiers) that
 * read them, the stats they give the model and how they fill their derived fields. A model lists
 * the features it has (`static features`); its rating, stats and derived data include theirs.
 */
import type { DataSchema } from "@common/abstract/_types.d.mts";
import type { ModelPropsFromSchema } from "@common/data/fields.d.mts";

import type { AmpEffect } from "../effects/amp-effect.ts";
import type { StatSheet } from "../stats/sheet.ts";
import type { StatBlock } from "../stats/types.ts";

export interface Feature<TSchema extends DataSchema> {
    /** The feature's fields. Touches `foundry.data.fields`: call only from `defineSchema()`. */
    readonly fields: () => TSchema;
    readonly effects: readonly AmpEffect<ModelPropsFromSchema<TSchema>>[];
    /** Stats the feature gives the model itself (e.g. a matrix device's firewall and track). */
    readonly stats?: StatBlock<ModelPropsFromSchema<TSchema>>;
    /**
     * Fills the feature's derived fields. `own` is the model's own stats. Features run in the order
     * listed, before the model's own `prepareFromStats`.
     */
    readonly prepare?: (data: ModelPropsFromSchema<TSchema>, own: StatSheet) => void;
}

/**
 * Any feature, whatever its schema. (`Feature<S>` doesn't widen to `Feature<DataSchema>`: its
 * effects read its own data, so its type parameter can only narrow.)
 */
export interface AnyFeature {
    readonly fields: () => DataSchema;
    readonly effects: readonly AmpEffect<never>[];
    readonly stats?: StatBlock<never>;
    readonly prepare?: (data: never, own: StatSheet) => void;
}

type SchemaOf<F> = F extends Feature<infer TSchema> ? TSchema : never;
type UnionToIntersection<U> = (U extends unknown ? (u: U) => void : never) extends (
    i: infer I,
) => void
    ? I
    : never;

/** The combined schema of a list of features (no fields for an empty list). */
export type FeaturesSchema<F extends readonly AnyFeature[]> = [F[number]] extends [never]
    ? Record<never, never>
    : UnionToIntersection<SchemaOf<F[number]>>;

/** The fields of a list of features, for a model's `defineSchema()`. */
export function featureFields<const F extends readonly AnyFeature[]>(
    features: F,
): FeaturesSchema<F> {
    return Object.assign({}, ...features.map((f) => f.fields())) as FeaturesSchema<F>;
}
