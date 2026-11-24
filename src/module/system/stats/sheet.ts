/** Resolving stats: stat sheets, and routing modifiers to them. */
import type { Combine, Modifier, StatBlock, StatKey } from "./types.ts";

/** One source's part of a stat. */
export interface Contribution {
    source: string;
    value: number;
}

interface StatEntry {
    base: number;
    combine: Combine;
    modifiers: (Modifier & { source: string })[];
}

/** A holder's stats: their bases from its stat block, and the modifiers it received. */
export class StatSheet {
    readonly #stats: Map<StatKey, StatEntry>;

    /** Use {@link statSheet}. */
    constructor(stats: Map<StatKey, StatEntry>) {
        this.#stats = stats;
    }

    /** Whether this holder has `stat`. */
    has(stat: StatKey): boolean {
        return this.#stats.has(stat);
    }

    /** Record a modifier from `source`. Ignored if this holder doesn't have the stat. */
    add(modifier: Modifier, source: string): void {
        this.#stats.get(modifier.stat)?.modifiers.push({ ...modifier, source });
    }

    /** The stat's final value (0 if the holder doesn't have it). */
    total(stat: StatKey): number {
        const entry = this.#stats.get(stat);
        if (!entry) return 0;
        if (entry.combine === "best") {
            return Math.max(entry.base, ...entry.modifiers.map((m) => m.value));
        }
        let total = entry.base;
        const groups = new Map<string, { sum: number; max: number }>();
        for (const m of entry.modifiers) {
            if (!m.stacking) {
                total += m.value;
                continue;
            }
            const group = groups.get(m.stacking.group) ?? { sum: 0, max: m.stacking.max };
            group.sum += m.value;
            groups.set(m.stacking.group, group);
        }
        for (const { sum, max } of groups.values()) total += Math.min(sum, max);
        return total;
    }

    /** Each modifier's source and value, in the order received. */
    contributions(stat: StatKey): Contribution[] {
        return (this.#stats.get(stat)?.modifiers ?? []).map(({ source, value }) => ({
            source,
            value,
        }));
    }

    /** The highest modifier and its source, or null if there is none. */
    best(stat: StatKey): Contribution | null {
        let best: Contribution | null = null;
        for (const c of this.contributions(stat)) if (!best || c.value > best.value) best = c;
        return best;
    }
}

/** A stat sheet for `holder`, with the stats its block declares and no modifiers yet. */
export function statSheet<THolder>(block: StatBlock<THolder>, holder: THolder): StatSheet {
    const stats = new Map<StatKey, StatEntry>();
    for (const stat of Object.keys(block) as StatKey[]) {
        const { base = 0, combine = "sum", when } = block[stat] ?? {};
        if (when && !when(holder)) continue;
        stats.set(stat, {
            base: typeof base === "function" ? base(holder) : base,
            combine,
            modifiers: [],
        });
    }
    return new StatSheet(stats);
}

/** Something that gives modifiers: an amp, a vehicle. `sheet` is its own stats, if it has any. */
export interface ModifierSource {
    name: string;
    modifiers: readonly Modifier[];
    sheet?: StatSheet | null;
}

/**
 * Send each source's modifiers to their targets: the source's own sheet (`self`) or the owner's
 * (`owner`). Modifiers whose target doesn't have the stat are dropped.
 */
export function applyModifiers(owner: StatSheet | null, sources: readonly ModifierSource[]): void {
    for (const { name, modifiers, sheet = null } of sources) {
        for (const modifier of modifiers) {
            (modifier.target === "self" ? sheet : owner)?.add(modifier, name);
        }
    }
}
