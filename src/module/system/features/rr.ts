import type { ModelPropsFromSchema } from "@common/data/fields.d.mts";

import { rrList, type RRListField } from "../schema/shared.ts";
import type { Feature } from "./feature.ts";

export type RRSchema = {
    rr: RRListField;
};

const RR_RATINGS = { specialization: 2, skill: 5, attribute: 10 } as const;
const RR_KEY = {
    specialization: "rrSpecialization",
    skill: "rrSkill",
    attribute: "rrAttribute",
} as const;

/**
 * Priced Risk Reduction: each entry costs 2 / 5 / 10 rating per point for a specialization / skill
 * / attribute. RR is read from its carriers directly when rolling (`rrSourcesFor`), not as stats.
 */
export const rr: Feature<RRSchema> = {
    fields: () => ({ rr: rrList() }),
    effects: [
        {
            key: "rr",
            rating: (a: ModelPropsFromSchema<RRSchema>) =>
                a.rr
                    .filter((e) => e.value > 0)
                    .map((e) => ({
                        key: RR_KEY[e.type],
                        value: e.value * RR_RATINGS[e.type],
                        count: e.value,
                    })),
            modifiers: () => [],
        },
    ],
};
