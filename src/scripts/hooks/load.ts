import { SRA2ActorProxy } from "@documents/actors.ts";
import { SRA2ItemProxy } from "@documents/items.ts";
import { actorModels, itemModels } from "@models/index.ts";

import type { HookModule } from "./index.ts";

/**
 * Script load, before any Foundry hook fires: swap in the system's document classes and each
 * sub-type's data model, so every Actor and Item Foundry constructs, from the first one on, is an
 * `SRA2Actor` / `SRA2Item` with typed `system` data.
 */
export const Load = {
    setup(): void {
        CONFIG.Actor.documentClass = SRA2ActorProxy;
        CONFIG.Actor.dataModels = actorModels;
        CONFIG.Item.documentClass = SRA2ItemProxy;
        CONFIG.Item.dataModels = itemModels;
    },
} satisfies HookModule;
