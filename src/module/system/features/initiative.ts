import type { ModelPropsFromSchema } from "@common/data/fields.d.mts";

import { INITIATIVE_REALM_DISCOUNT, INITIATIVE_TIER_RATINGS } from "../constants.ts";
import { type AmpEffect, localMax } from "../effects/amp-effect.ts";
import { INITIATIVE_REALMS, type InitiativeRealm, REALMS } from "../enums.ts";
import { choice, type ChoiceField, int, type NumField } from "../schema/fields.ts";
import type { Modifier } from "../stats/types.ts";
import type { Feature } from "./feature.ts";

const sum = (values: readonly number[]) => values.reduce((a, b) => a + b, 0);

export type InitiativeSchema = {
    /**
     * Initiative enhancement tier (0–3, cumulative): 1 = +1 edge per action scene and may spend
     * edge for extra actions; 2 = also +1 action per narration; 3 = also another +1 edge per
     * scene.
     */
    initiativeEnhancement: NumField;
    /** Every realm, or limited to one (each tier 1 rating cheaper). */
    initiativeRealm: ChoiceField<InitiativeRealm>;
};

/**
 * Initiative enhancement, tiers 1–3, cumulative: tier 1 gives +1 edge per action scene and lets the
 * character spend edge for extra actions; tier 2 adds +1 action per narration; tier 3 adds another
 * +1 edge per action scene. Limiting it to one realm makes each tier 1 rating cheaper. Several
 * sources don't stack: in each realm, only the best tier applies.
 */
export const initiativeEffect: AmpEffect<ModelPropsFromSchema<InitiativeSchema>> = {
    key: "initiativeEnhancement",
    max: { local: INITIATIVE_TIER_RATINGS.length },
    rating: (a) => {
        const tier = a.initiativeEnhancement;
        if (!tier) return [];
        const discount = a.initiativeRealm !== "all" ? INITIATIVE_REALM_DISCOUNT : 0;
        const value = sum(
            INITIATIVE_TIER_RATINGS.slice(0, tier).map((rating) => rating - discount),
        );
        return [{ key: "initiativeEnhancement", value, count: tier }];
    },
    modifiers: (a): Modifier[] => {
        const tier = a.initiativeEnhancement;
        if (!tier) return [];
        const realms = a.initiativeRealm === "all" ? REALMS : [a.initiativeRealm];
        return realms.map((realm) => ({
            stat: `initiative.${realm}` as const,
            value: tier,
            target: "owner",
        }));
    },
};

/** Initiative enhancement: qualities, cyberware, bioware, adept powers. */
export const initiative: Feature<InitiativeSchema> = {
    fields: () => ({
        initiativeEnhancement: int(0, { min: 0, max: localMax(initiativeEffect) }),
        initiativeRealm: choice(INITIATIVE_REALMS, "all"),
    }),
    effects: [initiativeEffect],
};
