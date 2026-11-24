/**
 * AmpEffect: an explicit, priced option carried by an amp or a vehicle. Every effect, linear or
 * not, prices itself (`rating`) and says what it changes (`modifiers`); consumers treat them all
 * alike. Also the builders for the common effect shapes, and totals over a model's effects.
 */
import type { Modifier, Stacking, StatKey, Target } from "../stats/types.ts";
import type { RatingEntry, RatingKey } from "./rating.ts";

/** How many times an effect can be taken on one item, e.g. firewall ≤ 5. Also the field's max. */
export interface AmpEffectMax {
    local?: number;
}

export interface AmpEffect<TData> {
    /** Stable identifier, unique across all effects. */
    readonly key: string;
    readonly max?: AmpEffectMax;
    // Function properties (not methods), so `TData` is checked strictly: an effect can only be
    // listed for models whose data has the fields it reads.
    /** Rating entries for the breakdown; empty when the effect isn't taken. */
    readonly rating: (data: TData) => RatingEntry[];
    /** The stat changes it makes, each with its target; empty when it changes nothing. */
    readonly modifiers: (data: TData) => Modifier[];
}

/** An effect's local max, for a schema field's `max`. */
export function localMax(effect: AmpEffect<never>): number | undefined {
    return effect.max?.local;
}

/* -------------------------------------------- */
/*  Builders                                    */
/* -------------------------------------------- */

/** What a taken effect changes: `stat` on `target`, optionally in a stacking group. */
interface ModifierOptions {
    stat?: StatKey;
    target?: Target;
    stacking?: Stacking;
}

/**
 * Taken a number of times, each adding `rating` to the model's rating; adds that number to `stat`.
 * e.g. firewall: +1 rating per point, +1 to the firewall stat each.
 */
export function perUnit<T>(
    options: {
        key: string;
        /** Breakdown line it appears under. */
        ratingKey: RatingKey;
        units: (data: T) => number;
        /** Rating added per unit (perUnit) or when taken (flagEffect). */
        rating: number;
        max?: AmpEffectMax;
    } & ModifierOptions,
): AmpEffect<T> {
    const { key, ratingKey, units, rating, max, stat, target = "owner", stacking } = options;
    return {
        key,
        ...(max ? { max } : {}),
        rating: (data) => {
            const count = units(data);
            return count ? [{ key: ratingKey, value: count * rating, count }] : [];
        },
        modifiers: (data) => {
            const count = units(data);
            return stat && count
                ? [{ stat, value: count, target, ...(stacking ? { stacking } : {}) }]
                : [];
        },
    };
}

/** Taken or not; adds `rating` when taken, and adds `value` to `stat`. e.g. +1 armor. */
export function flagEffect<T>(
    options: {
        key: string;
        /** Breakdown line it appears under. */
        ratingKey: RatingKey;
        on: (data: T) => boolean;
        /** Rating added per unit (perUnit) or when taken (flagEffect). */
        rating: number;
        value?: number;
        max?: AmpEffectMax;
    } & ModifierOptions,
): AmpEffect<T> {
    const {
        key,
        ratingKey,
        on,
        rating,
        value = 1,
        max,
        stat,
        target = "owner",
        stacking,
    } = options;
    return {
        key,
        ...(max ? { max } : {}),
        rating: (data) => (on(data) ? [{ key: ratingKey, value: rating, count: null }] : []),
        modifiers: (data) =>
            stat && on(data) ? [{ stat, value, target, ...(stacking ? { stacking } : {}) }] : [],
    };
}

/** A fixed base rating, e.g. +1 for any cyberware. */
export function baseRating(key: string, ratingKey: RatingKey, value: number): AmpEffect<unknown> {
    return {
        key,
        rating: () => [{ key: ratingKey, value, count: null }],
        modifiers: () => [],
    };
}

/* -------------------------------------------- */
/*  Totals                                      */
/* -------------------------------------------- */

/** A model's rating from its effects, and the breakdown of where it comes from. */
export function computeRating<TData>(
    data: TData,
    effects: readonly AmpEffect<TData>[],
): { rating: number; breakdown: RatingEntry[] } {
    const breakdown = effects.flatMap((effect) => effect.rating(data));
    return { rating: breakdown.reduce((n, e) => n + e.value, 0), breakdown };
}

/** Every modifier a model's effects make. */
export function effectModifiers<TData>(
    data: TData,
    effects: readonly AmpEffect<TData>[],
): Modifier[] {
    return effects.flatMap((e) => e.modifiers(data));
}

/** Narrative effects as rating entries: positive ones add their value, drawbacks subtract theirs. */
export function signedSums(effects: readonly { value: number }[]): RatingEntry[] {
    const sum = (values: readonly number[]) => values.reduce((a, b) => a + b, 0);
    const positive = effects.filter((e) => e.value > 0);
    const negative = effects.filter((e) => e.value < 0);
    const out: RatingEntry[] = [];
    if (positive.length) {
        out.push({
            key: "narrativeEffectsPositive",
            value: sum(positive.map((e) => e.value)),
            count: positive.length,
        });
    }
    if (negative.length) {
        out.push({
            key: "narrativeEffectsNegative",
            value: sum(negative.map((e) => e.value)),
            count: negative.length,
        });
    }
    return out;
}
