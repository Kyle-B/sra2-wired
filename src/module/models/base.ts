import type { DataModelConstructionContext } from "@common/abstract/_types.d.mts";
import type { DataSchema } from "@common/abstract/_types.d.mts";
import type { SourceFromSchema } from "@common/data/fields.d.mts";
import type { SRA2Actor } from "@documents/actor.ts";
import type { SRA2Item } from "@documents/item.ts";

/**
 * Base of every SRA2 data model. Foundry types a model's constructor data as plain `object`; this
 * narrows it to the model's own source, so a standalone model (e.g. `new CyberdeckModel({ firewall:
 * 2 })`) is type-checked. Omitted fields take their initial values.
 */
export abstract class SystemModel<
    TParent extends SRA2Actor | SRA2Item,
    TSchema extends DataSchema,
> extends foundry.abstract.TypeDataModel<TParent, TSchema> {
    constructor(
        data?: DeepPartial<SourceFromSchema<TSchema>>,
        options?: DataModelConstructionContext<TParent | null>,
    ) {
        super(data, options);
    }
}
