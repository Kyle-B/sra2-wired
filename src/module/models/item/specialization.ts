import type { ModelPropsFromSchema } from "@common/data/fields.d.mts";
import type { SRA2Item } from "@documents/item.ts";
import { migrateSpecialization } from "@migration/legacy/index.ts";
import { SystemModel } from "@models/base.ts";
import { ATTRIBUTES, type Attribute, specializationCost } from "@system";
import {
    choice,
    type ChoiceField,
    derivedNum,
    type NumField,
    set,
    type SetOf,
    str,
    type StrField,
} from "@system/schema/fields.ts";
import { itemBaseFields, type ItemBaseSchema } from "@system/schema/shared.ts";

export type SpecializationSchema = ItemBaseSchema & {
    /** Slug of the parent skill. */
    linkedSkill: StrField;
    /**
     * Attributes it can be rolled with, in order: one of its skill's `linkedAttributes`, except a
     * few (lockpicking; conjuration's, whose attribute each character picks once).
     */
    linkedAttributes: SetOf<ChoiceField<Attribute>>;
    /** Language-independent identifier, e.g. "spec_pistols". Filled from the name when blank. */
    slug: StrField;

    // Derived (not persisted)
    /** Nuyen cost. */
    cost: NumField;
};

// Schema fields are populated by DataModel at runtime; the merged interface only types them.
// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export class SpecializationModel extends SystemModel<SRA2Item, SpecializationSchema> {
    static override defineSchema(): SpecializationSchema {
        return {
            ...itemBaseFields(),
            linkedSkill: str(),
            linkedAttributes: set(choice(ATTRIBUTES, "strength"), ["strength"]),
            slug: str(),
            cost: derivedNum(),
        };
    }

    static override migrateData(source: Record<string, unknown>): Record<string, unknown> {
        migrateSpecialization(source);
        return super.migrateData(source);
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();
        this.cost = specializationCost();
    }
}

// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export interface SpecializationModel extends ModelPropsFromSchema<SpecializationSchema> {}
