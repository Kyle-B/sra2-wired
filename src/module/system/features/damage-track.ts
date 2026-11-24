/**
 * The damage track a model holds itself, and the damage boxes bought on top of it. Anything that
 * can take damage (a character, a vehicle, a matrix device, ICE) has exactly one track; what can
 * reach it (physical, mental or matrix damage) is a matter of thresholds, not of another track.
 * Every track has the same base boxes and exactly one incapacitated box, which can't be bought.
 */
import type { ModelPropsFromSchema } from "@common/data/fields.d.mts";

import { BASE_DAMAGE_BOXES, DAMAGE_BOX_RATINGS } from "../constants.ts";
import { type DamageBoxes, trackBoxes } from "../damage.ts";
import { perUnit } from "../effects/amp-effect.ts";
import { type Schema } from "../schema/fields.ts";
import {
    type DamageBoxesSchema,
    damageTrack,
    type DamageTrackSchema,
    derivedDamageBoxes,
    extraDamageBoxes,
    type ExtraDamageBoxesSchema,
} from "../schema/shared.ts";
import type { StatSheet } from "../stats/sheet.ts";
import type { StatBlock, Target } from "../stats/types.ts";
import type { Feature } from "./feature.ts";

/** A track's base box stats. @param when The holder has the track only when this is true. */
export function trackStats<T>(when?: (holder: T) => boolean): StatBlock<T> {
    return {
        "damageBoxes.light": { base: BASE_DAMAGE_BOXES.light, when },
        "damageBoxes.serious": { base: BASE_DAMAGE_BOXES.serious, when },
    };
}

/** A track's box totals from the holder's own stats. */
function ownTrackBoxes(own: StatSheet): DamageBoxes {
    return trackBoxes(own.total("damageBoxes.light"), own.total("damageBoxes.serious"));
}

/* -------------------------------------------- */
/*  Own track: vehicles, matrix devices         */
/* -------------------------------------------- */

export type OwnTrackSchema = {
    /** Filled box counts. */
    damage: Schema<DamageTrackSchema>;

    // Derived (not persisted)
    /** Box totals: the base track plus any boxes bought on it. */
    damageBoxes: Schema<DamageBoxesSchema>;
};

export function ownTrackFields(): OwnTrackSchema {
    return { damage: damageTrack(), damageBoxes: derivedDamageBoxes() };
}

export function prepareOwnTrack(data: ModelPropsFromSchema<OwnTrackSchema>, own: StatSheet): void {
    data.damageBoxes = ownTrackBoxes(own);
}

/** A damage track of the model's own. */
export const ownTrack: Feature<OwnTrackSchema> = {
    fields: ownTrackFields,
    effects: [],
    stats: trackStats(),
    prepare: prepareOwnTrack,
};

/* -------------------------------------------- */
/*  Extra damage boxes                          */
/* -------------------------------------------- */

export type ExtraBoxesSchema = {
    /** Damage boxes bought (+3 rating per light, +6 per serious). */
    extraDamageBoxes: Schema<ExtraDamageBoxesSchema>;
};

type ExtraBoxesData = ModelPropsFromSchema<ExtraBoxesSchema>;

/**
 * Bought damage boxes, priced +3 rating per light box and +6 per serious, that go on `target`'s
 * track. `keys` are the effects' keys, which must be unique across all effects.
 */
function extraBoxes(
    keys: readonly [light: string, serious: string],
    target: Target,
): Feature<ExtraBoxesSchema> {
    return {
        fields: () => ({ extraDamageBoxes: extraDamageBoxes() }),
        effects: [
            perUnit<ExtraBoxesData>({
                key: keys[0],
                ratingKey: "lightBoxes",
                units: (a) => a.extraDamageBoxes.light,
                rating: DAMAGE_BOX_RATINGS.light,
                stat: "damageBoxes.light",
                target,
            }),
            perUnit<ExtraBoxesData>({
                key: keys[1],
                ratingKey: "seriousBoxes",
                units: (a) => a.extraDamageBoxes.serious,
                rating: DAMAGE_BOX_RATINGS.serious,
                stat: "damageBoxes.serious",
                target,
            }),
        ],
    };
}

/** Boxes bought on an amp that go on its owner's track: qualities, cyber/bioware, adept powers. */
export const extraBoxesOnOwner = extraBoxes(["lightBoxes", "seriousBoxes"], "owner");

/** Boxes bought on a model that go on its own track: a vehicle's, a cyberdeck's. */
export const extraBoxesOnSelf = extraBoxes(["ownLightBoxes", "ownSeriousBoxes"], "self");
