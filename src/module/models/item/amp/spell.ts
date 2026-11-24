import type { ModelPropsFromSchema } from "@common/data/fields.d.mts";
import {
    type AmpEffect,
    attack,
    type AttackSchema,
    type AttackSkills,
    baseRating,
    SPELL_CATEGORIES,
    SPELL_SPECIALIZATIONS,
    SPELL_TYPES,
    type SpellCategory,
    type SpellType,
    type StatSheet,
} from "@system";
import { choice, type ChoiceField } from "@system/schema/fields.ts";

import { type AmpBaseSchema, ampFields, AmpModel } from "./base.ts";

/** Skills a spell of `category` is cast with: always sorcery, specialized by category. */
export function spellAttackSkills(category: SpellCategory): AttackSkills {
    return { skill: "sorcery", specialization: SPELL_SPECIALIZATIONS[category] };
}

export type SpellSchema = AmpBaseSchema &
    AttackSchema & {
        spellType: ChoiceField<SpellType>;
        /** Spell category; decides the specialization it is cast with. */
        category: ChoiceField<SpellCategory>;
    };

// Schema fields are populated by DataModel at runtime; the merged interface only types them.
// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export class SpellModel extends AmpModel<SpellSchema> {
    static override readonly ampType = "spell";
    static override readonly kind = "trait";
    static override readonly features = [attack] as const;

    static override defineSchema(): SpellSchema {
        return {
            ...ampFields(this.features),
            spellType: choice(SPELL_TYPES, "direct"),
            category: choice(SPELL_CATEGORIES, "combat"),
        };
    }

    static override readonly effects: readonly AmpEffect<SpellModel>[] = [
        baseRating("spellBaseRating", "spell", 1),
    ];

    /** A spell's category fixes the skills it is cast with. */
    protected override prepareFromStats(_own: StatSheet): void {
        this.resolvedAttack = spellAttackSkills(this.category);
    }
}

// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export interface SpellModel extends ModelPropsFromSchema<SpellSchema> {}
