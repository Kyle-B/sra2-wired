import { migrateActorDocument } from "@migration/legacy/index.ts";
import type { CharacterModel } from "@models/actor/character.ts";
import type { IceModel } from "@models/actor/ice.ts";
import type { ServerModel } from "@models/actor/server.ts";
import type { VehicleModel } from "@models/actor/vehicle.ts";

import type { ActorOf } from "./actors.ts";
import type { ItemType, SRA2Item } from "./item.ts";
import type { AmpItem, ItemOf } from "./items.ts";

/** Actor sub-type → its system data model. */
export interface ActorSystemMap {
    character: CharacterModel;
    vehicle: VehicleModel;
    ice: IceModel;
    server: ServerModel;
}

export type ActorType = keyof ActorSystemMap;

export class SRA2Actor<
    TParent extends TokenDocument | null = TokenDocument | null,
> extends Actor<TParent> {
    declare system: ActorSystemMap[ActorType];
    declare items: foundry.abstract.EmbeddedCollection<SRA2Item<this>>;

    static override migrateData(source: Record<string, unknown>): Record<string, unknown> {
        migrateActorDocument(source);
        return super.migrateData(source);
    }

    /** Type guard narrowing to the document class for `type`. */
    isType<T extends ActorType>(type: T): this is ActorOf<T> {
        return this.type === type;
    }

    /** Embedded amps of every amp type. */
    amps(): AmpItem<this>[] {
        return this.items.filter((item): item is AmpItem<this> => item.isAmp());
    }

    /** Embedded items of one sub-type, typed. */
    itemsOfType<T extends ItemType>(type: T): ItemOf<T, this>[] {
        const items: ItemOf<T, this>[] = [];
        for (const item of this.items) if (item.isType(type)) items.push(item);
        return items;
    }
}
