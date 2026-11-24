import type { ModelPropsFromSchema } from "@common/data/fields.d.mts";

import { localMax, perUnit } from "../effects/amp-effect.ts";
import { bool, type BoolField, int, type NumField } from "../schema/fields.ts";
import type { StatBlock } from "../stats/types.ts";
import {
    ownTrackFields,
    type OwnTrackSchema,
    prepareOwnTrack,
    trackStats,
} from "./damage-track.ts";
import type { Feature } from "./feature.ts";

/**
 * A matrix device: gear with a firewall and a damage track of its own, so a matrix attack can
 * target and damage it. (Gear's physical damage isn't tracked, so this is its only track.) Only a
 * cyberdeck's firewall protects its owner's persona.
 */
export type MatrixDeviceSchema = OwnTrackSchema & {
    /** Firewall rating (+1 rating per point). */
    firewall: NumField;
};

/** A matrix device that can be switched off: equipment is only a matrix device when wireless. */
export type OptionalMatrixDeviceSchema = MatrixDeviceSchema & {
    /** Whether this piece of equipment is a matrix device (has a firewall and a damage track). */
    matrixCapable: BoolField;
};

type MatrixDeviceData = ModelPropsFromSchema<MatrixDeviceSchema>;

export const firewallEffect = perUnit<Pick<MatrixDeviceData, "firewall">>({
    key: "firewall",
    ratingKey: "firewall",
    units: (a) => a.firewall,
    rating: 1,
    stat: "firewall",
    target: "self",
    max: { local: 5 },
});

/** The firewall field. @param initial Starting rating: decks start at 1. */
export function firewallField(initial: number): NumField {
    return int(initial, { min: 0, max: localMax(firewallEffect) });
}

/** A device's firewall and its track (the same base track as any other). */
function matrixStats<T>(when?: (holder: T) => boolean): StatBlock<T> {
    return { firewall: { when }, ...trackStats(when) };
}

function matrixDeviceFields(): MatrixDeviceSchema {
    return { ...ownTrackFields(), firewall: firewallField(0) };
}

/** Always a matrix device: cyberdecks and cyberware. */
export const matrixDevice: Feature<MatrixDeviceSchema> = {
    fields: matrixDeviceFields,
    effects: [firewallEffect],
    stats: matrixStats(),
    prepare: prepareOwnTrack,
};

/** A matrix device only while `matrixCapable` is on: equipment. */
export const optionalMatrixDevice: Feature<OptionalMatrixDeviceSchema> = {
    fields: () => ({ ...matrixDeviceFields(), matrixCapable: bool() }),
    effects: [firewallEffect],
    stats: matrixStats((a) => a.matrixCapable),
    prepare: prepareOwnTrack,
};
