import type { HookModule } from "./index.ts";

/** `ready`: the world is fully loaded. */
export const Ready = {
    setup(): void {
        Hooks.once("ready", () => {
            console.log(`${game.system.id} | ready (v${game.system.version})`);
        });
    },
} satisfies HookModule;
