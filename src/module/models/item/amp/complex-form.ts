import type { ModelPropsFromSchema } from "@common/data/fields.d.mts";
import {
    type AmpEffect,
    attack,
    type AttackSchema,
    type AttackSkills,
    baseRating,
    COMPLEX_FORM_CATEGORIES,
    COMPLEX_FORM_SPECIALIZATIONS,
    type ComplexFormCategory,
    COSTS,
    type StatSheet,
} from "@system";
import { choice, type ChoiceField } from "@system/schema/fields.ts";

import { type AmpBaseSchema, ampFields, AmpModel } from "./base.ts";

/** Skills a complex form of `category` uses: always technomancer, specialized by category. */
export function complexFormAttackSkills(category: ComplexFormCategory): AttackSkills {
    return { skill: "technomancer", specialization: COMPLEX_FORM_SPECIALIZATIONS[category] };
}

export type ComplexFormSchema = AmpBaseSchema &
    AttackSchema & {
        /** Complex-form category; decides the specialization it uses. */
        category: ChoiceField<ComplexFormCategory>;
    };

// Schema fields are populated by DataModel at runtime; the merged interface only types them.
// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export class ComplexFormModel extends AmpModel<ComplexFormSchema> {
    static override readonly ampType = "complexForm";
    static override readonly kind = "trait";
    static override readonly features = [attack] as const;

    static override defineSchema(): ComplexFormSchema {
        return {
            ...ampFields(this.features),
            category: choice(COMPLEX_FORM_CATEGORIES, "complexForms"),
        };
    }

    static override readonly effects: readonly AmpEffect<ComplexFormModel>[] = [
        baseRating("complexFormBaseRating", "complexForm", 1),
    ];

    /** A complex form has a flat price, whatever its rating. */
    override computeCost(): number {
        return COSTS.complexForm;
    }

    /** A complex form's category fixes the skills it uses. */
    protected override prepareFromStats(_own: StatSheet): void {
        this.resolvedAttack = complexFormAttackSkills(this.category);
    }
}

// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export interface ComplexFormModel extends ModelPropsFromSchema<ComplexFormSchema> {}
