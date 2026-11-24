import type { ModelPropsFromSchema } from "@common/data/fields.d.mts";

import { localMax, perUnit } from "../effects/amp-effect.ts";
import { int, type NumField } from "../schema/fields.ts";
import type { Feature } from "./feature.ts";

export type SpellSupportSchema = {
    /** Extra spells the owner can sustain (+2 rating each). */
    sustainedSpells: NumField;
    /** Extra spirits the owner can keep summoned (+3 rating each). */
    summonedSpirits: NumField;
};

type SpellSupportData = ModelPropsFromSchema<SpellSupportSchema>;

const sustainedSpellsEffect = perUnit<SpellSupportData>({
    key: "sustainedSpells",
    ratingKey: "sustainedSpells",
    units: (a) => a.sustainedSpells,
    rating: 2,
    stat: "sustainedSpells",
    max: { local: 2 },
});

const summonedSpiritsEffect = perUnit<SpellSupportData>({
    key: "summonedSpirits",
    ratingKey: "summonedSpirits",
    units: (a) => a.summonedSpirits,
    rating: 3,
    stat: "summonedSpirits",
    max: { local: 1 },
});

/** Extra sustained spells and summoned spirits: qualities, equipment. */
export const spellSupport: Feature<SpellSupportSchema> = {
    fields: () => ({
        sustainedSpells: int(0, { min: 0, max: localMax(sustainedSpellsEffect) }),
        summonedSpirits: int(0, { min: 0, max: localMax(summonedSpiritsEffect) }),
    }),
    effects: [sustainedSpellsEffect, summonedSpiritsEffect],
};
