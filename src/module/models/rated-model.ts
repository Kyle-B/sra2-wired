/**
 * Base of the models whose effects add up to a rating: amps and vehicles. A subclass declares, next
 * to its schema, the features it has, its own effects and the stats it holds; its rating, stats and
 * derived data come from those.
 *
 *     export class CyberdeckModel extends AmpModel<CyberdeckSchema> {
 *         static override readonly features = [matrixDevice, extraBoxesOnSelf] as const;
 *         static override defineSchema(): CyberdeckSchema { return { ...ampFields(this.features), … }; }
 *         static override readonly effects: readonly AmpEffect<CyberdeckModel>[] = [ … ];
 *     }
 */
import type { ModelPropsFromSchema } from "@common/data/fields.d.mts";
import type { SRA2Actor } from "@documents/actor.ts";
import type { SRA2Item } from "@documents/item.ts";
import { SystemModel } from "@models/base.ts";
import {
    type AmpEffect,
    type AnyFeature,
    applyModifiers,
    computeRating,
    effectModifiers,
    type Modifier,
    type RatedSchema,
    type RatingEntry,
    type StatBlock,
    type StatSheet,
    statSheet,
} from "@system";

type AnyRatedModel = RatedModel<SRA2Actor | SRA2Item, RatedSchema>;

/**
 * A model's effects, typed to read that model. They were declared on its type (or its features,
 * whose data it has), which is what makes the cast sound. Module functions rather than members, so
 * the `this`-typed result doesn't make subclasses incompatible with their base.
 */
function ownEffects<T extends AnyRatedModel>(model: T): readonly AmpEffect<T>[] {
    return model.effects() as unknown as readonly AmpEffect<T>[];
}

/** A model's stat block, typed to read that model (see {@link ownEffects}). */
function ownStatBlock<T extends AnyRatedModel>(model: T): StatBlock<T> {
    return model.statBlock() as unknown as StatBlock<T>;
}

// Schema fields are populated by DataModel at runtime; the merged interface only types them.
// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export abstract class RatedModel<
    TParent extends SRA2Actor | SRA2Item,
    TSchema extends RatedSchema,
> extends SystemModel<TParent, TSchema> {
    /** Features every model of this family has (e.g. every amp's), before the type's own. */
    static readonly baseFeatures: readonly AnyFeature[] = [];
    /** The features this type has. */
    static readonly features: readonly AnyFeature[] = [];
    /** Effects only this type has (e.g. its base rating). */
    static readonly effects: readonly AmpEffect<never>[] = [];
    /** Stats a model of this type holds itself, besides its features'. */
    static readonly statBlock: StatBlock<never> = {};

    /** The base features and the type's own, in order. */
    #features(): readonly AnyFeature[] {
        const type = this.constructor as typeof RatedModel;
        return [...type.baseFeatures, ...type.features];
    }

    /**
     * Every effect this model carries: its features' and its type's own. The one place effects are
     * gathered, so effects defined on a single item can be added here later. Each reads the data of
     * the model it is declared on, so they are only applied to this model (see `ownEffects`).
     */
    effects(): readonly AmpEffect<never>[] {
        const type = this.constructor as typeof RatedModel;
        return [...this.#features().flatMap((f) => f.effects), ...type.effects];
    }

    /** The stats this model holds itself: its features' and its type's own. */
    statBlock(): StatBlock<never> {
        const type = this.constructor as typeof RatedModel;
        return Object.assign({}, ...this.#features().map((f) => f.stats ?? {}), type.statBlock);
    }

    /** This model's rating and the breakdown of where it comes from, from its stored data. */
    computeRating(): { rating: number; breakdown: RatingEntry[] } {
        return computeRating(this, ownEffects(this));
    }

    /** Every modifier this model's effects make, whatever their target. */
    modifiers(): Modifier[] {
        return effectModifiers(this, ownEffects(this));
    }

    /** This model's own stat sheet, with no modifiers yet (empty if it holds no stats). */
    statSheet(): StatSheet {
        return statSheet(ownStatBlock(this), this);
    }

    /** This model's own stats, from its own modifiers only (nothing from its owner or others). */
    ownStats(): StatSheet {
        const sheet = this.statSheet();
        applyModifiers(null, [{ name: "", modifiers: this.modifiers(), sheet }]);
        return sheet;
    }

    /** Fills the rating and breakdown, then the features' derived fields, then the type's own. */
    override prepareDerivedData(): void {
        super.prepareDerivedData();
        const { rating, breakdown } = this.computeRating();
        this.rating = rating;
        this.ratingBreakdown = breakdown;
        const own = this.ownStats();
        for (const feature of this.#features()) feature.prepare?.(this as never, own);
        this.prepareFromStats(own);
    }

    /** Fills this type's own derived fields, after its features'. `own` is its own stats. */
    protected prepareFromStats(_own: StatSheet): void {}
}

// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export interface RatedModel<
    // Merging requires the class's type parameters, so they are declared but unused here.
    // oxlint-disable-next-line no-unused-vars
    TParent extends SRA2Actor | SRA2Item,
    // oxlint-disable-next-line no-unused-vars
    TSchema extends RatedSchema,
> extends ModelPropsFromSchema<RatedSchema> {}
