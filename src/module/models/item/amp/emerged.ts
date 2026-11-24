import type { ModelPropsFromSchema } from "@common/data/fields.d.mts";
import { type AmpEffect, flagEffect, localMax, perUnit } from "@system";
import { bool, type BoolField, int, type NumField } from "@system/schema/fields.ts";

import { type AmpBaseSchema, ampFields, AmpModel } from "./base.ts";

export type EmergedSchema = AmpBaseSchema & {
    /** Matrix access through the living persona (+7 rating). */
    matrixAccess: BoolField;
    complexFormWeaving: BoolField;
    spriteCompilation: BoolField;
    /** Biofeedback vulnerability (-2 rating). */
    biofeedback: BoolField;
    /** Extra compiled sprites (+3 rating each). */
    compiledSprites: NumField;
    /** Extra sustained complex forms (+2 rating each). */
    sustainedComplexForms: NumField;
};

type Data = Pick<EmergedModel, "compiledSprites" | "sustainedComplexForms">;

const compiledSpritesEffect = perUnit<Data>({
    key: "compiledSprites",
    ratingKey: "compiledSprites",
    units: (a) => a.compiledSprites,
    rating: 3,
    stat: "compiledSprites",
    max: { local: 1 },
});

const sustainedComplexFormsEffect = perUnit<Data>({
    key: "sustainedComplexForms",
    ratingKey: "sustainedComplexForms",
    units: (a) => a.sustainedComplexForms,
    rating: 2,
    stat: "sustainedComplexForms",
    max: { local: 2 },
});

// Schema fields are populated by DataModel at runtime; the merged interface only types them.
// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export class EmergedModel extends AmpModel<EmergedSchema> {
    static override readonly ampType = "emerged";
    static override readonly kind = "trait";

    static override defineSchema(): EmergedSchema {
        return {
            ...ampFields([]),
            matrixAccess: bool(),
            complexFormWeaving: bool(),
            spriteCompilation: bool(),
            biofeedback: bool(),
            compiledSprites: int(0, { min: 0, max: localMax(compiledSpritesEffect) }),
            sustainedComplexForms: int(0, { min: 0, max: localMax(sustainedComplexFormsEffect) }),
        };
    }

    static override readonly effects: readonly AmpEffect<EmergedModel>[] = [
        flagEffect<EmergedModel>({
            key: "matrixAccess",
            ratingKey: "matrixAccess",
            on: (a) => a.matrixAccess,
            rating: 7,
        }),
        flagEffect<EmergedModel>({
            key: "complexFormWeaving",
            ratingKey: "complexFormWeaving",
            on: (a) => a.complexFormWeaving,
            rating: 1,
        }),
        flagEffect<EmergedModel>({
            key: "spriteCompilation",
            ratingKey: "spriteCompilation",
            on: (a) => a.spriteCompilation,
            rating: 1,
        }),
        flagEffect<EmergedModel>({
            key: "emergedBiofeedback",
            ratingKey: "emergedBiofeedback",
            on: (a) => a.biofeedback,
            rating: -2,
        }),
        compiledSpritesEffect,
        sustainedComplexFormsEffect,
    ];
}

// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export interface EmergedModel extends ModelPropsFromSchema<EmergedSchema> {}
