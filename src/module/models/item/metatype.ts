import type { ModelPropsFromSchema } from "@common/data/fields.d.mts";
import type { SRA2Item } from "@documents/item.ts";
import { migrateMetatype } from "@migration/legacy/index.ts";
import { SystemModel } from "@models/base.ts";
import { BASE_EDGE } from "@system";
import { int, type NumField, schema, type Schema } from "@system/schema/fields.ts";
import {
    type AttributesSchema,
    itemBaseFields,
    type ItemBaseSchema,
} from "@system/schema/shared.ts";

export type MetatypeSchema = ItemBaseSchema & {
    /** Highest level a character of this metatype can reach in each attribute. */
    maxAttributes: Schema<AttributesSchema>;
    /** Edge a character of this metatype starts with. */
    edge: NumField;
};

/** Metatypes cap a character's attributes and set its starting edge. */
// Schema fields are populated by DataModel at runtime; the merged interface only types them.
// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export class MetatypeModel extends SystemModel<SRA2Item, MetatypeSchema> {
    static override defineSchema(): MetatypeSchema {
        const max = () => int(4, { min: 1, max: 10 });
        return {
            ...itemBaseFields(),
            maxAttributes: schema({
                strength: max(),
                agility: max(),
                willpower: max(),
                logic: max(),
                charisma: max(),
            }),
            edge: int(BASE_EDGE, { min: 0, max: 10 }),
        };
    }

    static override migrateData(source: Record<string, unknown>): Record<string, unknown> {
        migrateMetatype(source);
        return super.migrateData(source);
    }
}

// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export interface MetatypeModel extends ModelPropsFromSchema<MetatypeSchema> {}
