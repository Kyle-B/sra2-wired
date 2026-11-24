import type { ModelPropsFromSchema } from "@common/data/fields.d.mts";
import type { SRA2Item } from "@documents/item.ts";
import { migrateSkill } from "@migration/legacy/index.ts";
import { SystemModel } from "@models/base.ts";
import { ATTRIBUTES, type Attribute, skillCost } from "@system";
import {
    choice,
    type ChoiceField,
    derivedNum,
    int,
    type NumField,
    set,
    type SetOf,
    str,
    type StrField,
} from "@system/schema/fields.ts";
import { itemBaseFields, type ItemBaseSchema } from "@system/schema/shared.ts";

export type SkillSchema = ItemBaseSchema & {
    rating: NumField;
    /** Attributes the skill can be rolled with, in order. A specialization picks one of them. */
    linkedAttributes: SetOf<ChoiceField<Attribute>>;
    /** Language-independent identifier, e.g. "closeCombat". Filled from the name when blank. */
    slug: StrField;

    // Derived (not persisted)
    /** Nuyen cost. */
    cost: NumField;
};

// Schema fields are populated by DataModel at runtime; the merged interface only types them.
// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export class SkillModel extends SystemModel<SRA2Item, SkillSchema> {
    static override defineSchema(): SkillSchema {
        return {
            ...itemBaseFields(),
            rating: int(1, { min: 0, max: 8 }),
            linkedAttributes: set(choice(ATTRIBUTES, "strength"), ["strength"]),
            slug: str(),
            cost: derivedNum(),
        };
    }

    static override migrateData(source: Record<string, unknown>): Record<string, unknown> {
        migrateSkill(source);
        return super.migrateData(source);
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();
        this.cost = skillCost(this.rating);
    }
}

// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export interface SkillModel extends ModelPropsFromSchema<SkillSchema> {}
