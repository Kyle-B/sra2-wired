import type { HookModule } from "./index.ts";

/** `init`: Foundry is initializing. Settings registration will live here. */
export const Init = {
    setup(): void {
        Hooks.once("init", () => {
            console.log(`${game.system.id} | init`);
        });
    },
} satisfies HookModule;
