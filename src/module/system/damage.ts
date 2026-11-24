import type { ModelPropsFromSchema } from "@common/data/fields.d.mts";
import type { AttributeRecord } from "@system/attributes.ts";
import { BASE_DAMAGE_BOXES, DAMAGE_STEP } from "@system/constants.ts";
import type {
    DamageBoxesSchema,
    DamageTrackSchema,
    ThresholdsSchema,
} from "@system/schema/shared.ts";
import type { DamageValue } from "@system/tables/weapons.ts";

export interface ResolvedDamage {
    /**
     * Final DV, or null when it can't be computed: toxin damage (resolved by the toxin's own
     * rules), or an attribute DV whose attribute isn't chosen.
     */
    value: number | null;
    spec: DamageValue;
    /** Total of all flat bonuses applied on top of the spec. */
    bonus: number;
}

/**
 * Resolve a damage spec against an actor's attributes.
 *
 * @param bonus Flat bonuses (bought damage bonus, weapon-type damage bonuses from other amps, …)
 */
export function resolveDamage(
    spec: DamageValue,
    attributes: AttributeRecord,
    bonus = 0,
): ResolvedDamage {
    switch (spec.mode) {
        case "toxin":
            return { value: null, spec, bonus };
        case "attribute":
            return spec.attribute === null
                ? { value: null, spec, bonus }
                : { value: attributes[spec.attribute] + spec.value + bonus, spec, bonus };
        case "fixed":
            return { value: spec.value + bonus, spec, bonus };
    }
}

/** Damage thresholds: damage strictly above a threshold reaches that severity. */
export type Thresholds = ModelPropsFromSchema<ThresholdsSchema>;

/** A damage track's box totals per severity. */
export type DamageBoxes = ModelPropsFromSchema<DamageBoxesSchema>;

/** A track's box totals from its light and serious totals; the incapacitated box is always one. */
export function trackBoxes(light: number, serious: number): DamageBoxes {
    return { light, serious, incapacitating: BASE_DAMAGE_BOXES.incapacitating };
}

/** Standard thresholds: base, base + step, base + 2×step. */
export function steppedThresholds(base: number, step = DAMAGE_STEP): Thresholds {
    return { light: base, serious: base + step, incapacitating: base + step * 2 };
}

/** Multiplied thresholds, used by matrix (firewall) and vehicle (structure) damage. */
export function multipliedThresholds(unit: number, offset = 0): Thresholds {
    return { light: unit + offset, serious: unit * 2 + offset, incapacitating: unit * 3 + offset };
}

export type Severity = "none" | "light" | "serious" | "incapacitating";

/** Severity of a hit: damage strictly greater than a threshold reaches that severity. */
export function severityFor(damage: number, thresholds: Thresholds): Severity {
    if (damage > thresholds.incapacitating) return "incapacitating";
    if (damage > thresholds.serious) return "serious";
    if (damage > thresholds.light) return "light";
    return "none";
}

/** A damage track as filled-box counts. */
export type DamageTrackState = ModelPropsFromSchema<DamageTrackSchema>;

/**
 * Apply one hit of the given severity to a track. Overflow cascades: a light hit on a full light
 * track becomes serious; a serious hit on a full serious track becomes incapacitating. Returns a
 * new track and whether the hit overflowed (including a hit that finds every box already full).
 */
export function applyHit(
    track: DamageTrackState,
    severity: Severity,
    boxes: DamageBoxes,
): { track: DamageTrackState; overflow: boolean } {
    const next = { ...track };
    let level = severity;
    let overflow = false;
    if (level === "light") {
        if (next.light < boxes.light) next.light++;
        else [level, overflow] = ["serious", true];
    }
    if (level === "serious") {
        if (next.serious < boxes.serious) next.serious++;
        else [level, overflow] = ["incapacitating", true];
    }
    if (level === "incapacitating") {
        if (next.incapacitating < boxes.incapacitating) next.incapacitating++;
        else overflow = true;
    }
    return { track: next, overflow };
}
