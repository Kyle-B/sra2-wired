import type { ModelPropsFromSchema } from "@common/data/fields.d.mts";
import type { Attribute } from "@system/attributes.ts";
import type { RRType } from "@system/enums.ts";
import type { RREntrySchema } from "@system/schema/shared.ts";

/** A Risk Reduction entry. */
export type RREntryData = ModelPropsFromSchema<RREntrySchema>;

/** Something that grants RR: an active amp, or a linked vehicle. */
export interface RRCarrier {
    name: string;
    rr: readonly RREntryData[];
}

export interface RRSource {
    source: string;
    type: RRType;
    target: string;
    value: number;
    label: string;
}

/** What a roll is made with. Each present key is matched against RR targets of that type. */
export interface RollTargets {
    attribute?: Attribute;
    skill?: string;
    specialization?: string;
}

/** All RR entries that apply to a roll, with their source names. Targets are compared by exact slug. */
export function rrSourcesFor(targets: RollTargets, carriers: Iterable<RRCarrier>): RRSource[] {
    const wanted: Partial<Record<RRType, string>> = {
        attribute: targets.attribute,
        skill: targets.skill,
        specialization: targets.specialization,
    };
    const out: RRSource[] = [];
    for (const carrier of carriers) {
        for (const rr of carrier.rr) {
            if (rr.value > 0 && rr.target !== "" && wanted[rr.type] === rr.target) {
                out.push({ source: carrier.name, ...rr });
            }
        }
    }
    return out;
}

export function totalRR(sources: readonly RRSource[]): number {
    return sources.reduce((n, s) => n + s.value, 0);
}

/** NPC threshold for a dice pool: round(pool / 3) + RR + 1. */
export function npcThreshold(dicePool: number, rr: number): number {
    return Math.round(dicePool / 3) + rr + 1;
}
