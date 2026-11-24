// Import Vite types, this adds declartions for things like importing *.scss,
// allowing us to avoid using noUncheckedSideEffectImports
/// <reference types="vite/client" />

import type { CompendiumDirectory } from "@client/applications/sidebar/tabs/_module.d.mts";
import type Hotbar from "@client/applications/ui/hotbar.d.mts";
import type { EffectsCanvasGroup } from "@client/canvas/groups/_module.d.mts";
import type Config from "@client/config.d.mts";
import type { SRA2Actor } from "@documents/actor.ts";
import type { SRA2Item } from "@documents/item.ts";

import Game = foundry.Game;

type Docs = typeof foundry.documents;

declare global {
    namespace globalThis {
        const game: Game<
            SRA2Actor<null>,
            foundry.documents.collections.Actors<SRA2Actor<null>>,
            ChatMessage,
            Combat,
            SRA2Item<null>,
            Macro,
            Scene,
            User
        >;

        const CONFIG: Config<
            InstanceType<Docs["AmbientLightDocument"]>,
            ActiveEffect<SRA2Actor | SRA2Item | null>,
            SRA2Actor,
            InstanceType<Docs["ActorDelta"]>,
            foundry.applications.sidebar.tabs.ChatLog,
            ChatMessage,
            Combat,
            Combatant<Combat | null, TokenDocument | null>,
            foundry.applications.sidebar.tabs.CombatTracker<Combat | null>,
            CompendiumDirectory,
            Hotbar<Macro>,
            SRA2Item,
            Macro,
            InstanceType<Docs["RegionDocument"]>,
            InstanceType<Docs["RegionBehavior"]>,
            InstanceType<Docs["TileDocument"]>,
            TokenDocument,
            InstanceType<Docs["WallDocument"]>,
            Scene,
            User,
            EffectsCanvasGroup
        >;
    }
}
