import { signedSums } from "../effects/amp-effect.ts";
import { narrativeEffects, type NarrativeEffectsField } from "../schema/shared.ts";
import type { Feature } from "./feature.ts";

export type NarrativeSchema = {
    narrativeEffects: NarrativeEffectsField;
};

/** Narrative effects count by value alone, text or not: positive ones add, drawbacks subtract. */
export const narrative: Feature<NarrativeSchema> = {
    fields: () => ({ narrativeEffects: narrativeEffects() }),
    effects: [
        {
            key: "narrativeEffects",
            rating: (a) => signedSums(a.narrativeEffects),
            modifiers: () => [],
        },
    ],
};
