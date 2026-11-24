import type { ModelPropsFromSchema } from "@common/data/fields.d.mts";
import type { SRA2Item } from "@documents/item.ts";
import { SystemModel } from "@models/base.ts";
import { knowledgeCost } from "@system";
import { derivedNum, type NumField, str, type StrField } from "@system/schema/fields.ts";
import { itemBaseFields, type ItemBaseSchema } from "@system/schema/shared.ts";

/**
 * A knowledge: something the character knows, bought at a flat price. It has no rating and is not
 * rolled.
 */
export type KnowledgeSchema = ItemBaseSchema & {
    /** Language-independent identifier. Filled from the name when blank. */
    slug: StrField;

    // Derived (not persisted)
    /** Nuyen cost. */
    cost: NumField;
};

// Schema fields are populated by DataModel at runtime; the merged interface only types them.
// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export class KnowledgeModel extends SystemModel<SRA2Item, KnowledgeSchema> {
    static override defineSchema(): KnowledgeSchema {
        return { ...itemBaseFields(), slug: str(), cost: derivedNum() };
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();
        this.cost = knowledgeCost();
    }
}

// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export interface KnowledgeModel extends ModelPropsFromSchema<KnowledgeSchema> {}
