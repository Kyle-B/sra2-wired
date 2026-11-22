// Import Vite types, this adds declartions for things like importing *.scss,
// allowing us to avoid using noUncheckedSideEffectImports
/// <reference types="vite/client" />

import Game = foundry.Game;

declare global {
    namespace globalThis {
        const game: Game<
            Actor<null>,
            foundry.documents.collections.Actors<Actor<null>>,
            ChatMessage,
            Combat,
            Item<null>,
            Macro,
            Scene,
            User
        >;
    }
}
