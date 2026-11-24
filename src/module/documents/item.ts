import { migrateItemDocument } from "@migration/legacy/index.ts";
import type { AmpSystemMap } from "@models/item/amp/index.ts";
import type { KnowledgeModel } from "@models/item/knowledge.ts";
import type { MetatypeModel } from "@models/item/metatype.ts";
import type { SkillModel } from "@models/item/skill.ts";
import type { SpecializationModel } from "@models/item/specialization.ts";
import { AMP_TYPES } from "@system";

import type { SRA2Actor } from "./actor.ts";
import type { AmpItem, ItemOf } from "./items.ts";

/** Item sub-type → its system data model. Every amp type is its own sub-type. */
export interface ItemSystemMap extends AmpSystemMap {
    skill: SkillModel;
    specialization: SpecializationModel;
    knowledge: KnowledgeModel;
    metatype: MetatypeModel;
}

export type ItemType = keyof ItemSystemMap;

const AMP_TYPE_SET: ReadonlySet<string> = new Set(AMP_TYPES);

export class SRA2Item<TParent extends SRA2Actor | null = SRA2Actor | null> extends Item<TParent> {
    declare system: ItemSystemMap[ItemType];

    static override migrateData(source: Record<string, unknown>): Record<string, unknown> {
        migrateItemDocument(source);
        return super.migrateData(source);
    }

    /** Type guard narrowing to the document class for `type`. */
    isType<T extends ItemType>(type: T): this is ItemOf<T, TParent> {
        return this.type === type;
    }

    /**
     * Type guard: is this item an amp (of any amp type)? Checks the type rather than `instanceof
     * AmpItem` so this module doesn't depend on the subclasses at runtime.
     */
    isAmp(): this is AmpItem<TParent> {
        return AMP_TYPE_SET.has(this.type);
    }
}
