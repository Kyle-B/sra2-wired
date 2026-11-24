import { AMP_TYPES } from "@system";
import { AmpSheet } from "@ui/item/amp-sheet.ts";

import type { HookModule } from "./index.ts";

/** `init`: Foundry is initializing. Registers the sheets; settings registration will live here. */
export const Init = {
    setup(): void {
        Hooks.once("init", () => {
            console.log(`${game.system.id} | init`);
            foundry.documents.collections.Items.registerSheet(game.system.id, AmpSheet, {
                types: [...AMP_TYPES],
                makeDefault: true,
                label: "SRA2.Sheet.amp",
            });
        });
    },
} satisfies HookModule;
