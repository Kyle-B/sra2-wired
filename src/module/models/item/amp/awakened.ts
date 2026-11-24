import type { ModelPropsFromSchema } from "@common/data/fields.d.mts";
import { type AmpEffect, flagEffect } from "@system";
import { bool, type BoolField } from "@system/schema/fields.ts";

import { type AmpBaseSchema, ampFields, AmpModel } from "./base.ts";

export type AwakenedSchema = AmpBaseSchema & {
    astralPerception: BoolField;
    /** Implies astral perception. */
    astralProjection: BoolField;
    sorcery: BoolField;
    conjuration: BoolField;
    adept: BoolField;
    /** Shamanic mask (-1 rating). */
    shamanicMask: BoolField;
};

// Schema fields are populated by DataModel at runtime; the merged interface only types them.
// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export class AwakenedModel extends AmpModel<AwakenedSchema> {
    static override readonly ampType = "awakened";
    static override readonly kind = "trait";

    static override defineSchema(): AwakenedSchema {
        return {
            ...ampFields([]),
            astralPerception: bool(),
            astralProjection: bool(),
            sorcery: bool(),
            conjuration: bool(),
            adept: bool(),
            shamanicMask: bool(),
        };
    }

    static override readonly effects: readonly AmpEffect<AwakenedModel>[] = [
        /** Astral projection implies (and replaces the cost of) astral perception. */
        {
            key: "astral",
            rating: (a) =>
                a.astralProjection
                    ? [{ key: "astralPerceptionProjection", value: 2, count: null }]
                    : a.astralPerception
                      ? [{ key: "astralPerception", value: 1, count: null }]
                      : [],
            modifiers: () => [],
        },
        flagEffect<AwakenedModel>({
            key: "sorcery",
            ratingKey: "sorcery",
            on: (a) => a.sorcery,
            rating: 1,
        }),
        flagEffect<AwakenedModel>({
            key: "conjuration",
            ratingKey: "conjuration",
            on: (a) => a.conjuration,
            rating: 2,
        }),
        flagEffect<AwakenedModel>({
            key: "adept",
            ratingKey: "adept",
            on: (a) => a.adept,
            rating: 1,
        }),
        flagEffect<AwakenedModel>({
            key: "shamanicMask",
            ratingKey: "shamanicMask",
            on: (a) => a.shamanicMask,
            rating: -1,
        }),
    ];
}

// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export interface AwakenedModel extends ModelPropsFromSchema<AwakenedSchema> {}
