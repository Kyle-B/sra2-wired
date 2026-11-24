/**
 * Every Foundry hook the system listens to. Each module is named after the hook it handles, or
 * after the feature when one feature spans several hooks, and registers its handlers in `setup()`.
 * `Load` is the exception: it runs its work immediately, at script load, before any hook fires.
 */
import { Init } from "./init.ts";
import { Load } from "./load.ts";
import { Ready } from "./ready.ts";

/** A hook module: registers its Foundry hook handlers. */
export interface HookModule {
    setup(): void;
}

export const SRA2Hooks = {
    /** Register all hook handlers. Call once, synchronously, when the system's script loads. */
    setup(): void {
        for (const hook of [Load, Init, Ready] satisfies HookModule[]) hook.setup();
    },
};
