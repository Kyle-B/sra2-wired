/**
 * The sheet for every amp type. A thin ItemSheetV2: Foundry handles the window, permissions and the
 * form (inputs carry `name="system.…"`, and each change submits through DocumentSheetV2's handler,
 * which validates against the schema and updates the item). Svelte renders the content.
 */
import type { ApplicationClosingOptions } from "@client/applications/_types.d.mts";
import type {
    DocumentSheetRenderContext,
    DocumentSheetRenderOptions,
} from "@client/applications/api/document-sheet.d.mts";
import type { AmpItem } from "@documents/items.ts";
import type { AmpModel } from "@models/item/amp/index.ts";
import { mount, unmount } from "svelte";

import { SheetContext } from "../sheet-context.svelte.ts";
import AmpSheetView from "./AmpSheet.svelte";

export interface AmpSheetContext extends Omit<DocumentSheetRenderContext, "document"> {
    document: AmpItem;
    item: AmpItem;
    system: AmpModel;
    /** HTML fields enriched for display (links, rolls, secrets). */
    enriched: { description: string; gmDescription: string };
}

const { ItemSheetV2 } = foundry.applications.sheets;

export class AmpSheet extends ItemSheetV2<AmpItem> {
    static override DEFAULT_OPTIONS = {
        classes: ["sra2-wired", "sheet", "item", "amp"],
        position: { width: 560, height: 600 },
        window: { resizable: true },
        form: { submitOnChange: true },
    };

    #context?: SheetContext<AmpSheetContext>;
    #component?: ReturnType<typeof mount>;
    #root?: HTMLElement;

    protected override async _prepareContext(
        options: DocumentSheetRenderOptions,
    ): Promise<AmpSheetContext> {
        const base = await super._prepareContext(options);
        const item = this.item;
        const enrich = (html: string) =>
            foundry.applications.ux.TextEditor.implementation.enrichHTML(html, {
                secrets: item.isOwner,
                relativeTo: item,
            });
        return {
            ...base,
            document: item,
            item,
            system: item.system,
            enriched: {
                description: await enrich(item.system.description),
                gmDescription: await enrich(item.system.gmDescription),
            },
        };
    }

    // Mount once and push each render's context into it, rather than remounting: a remount would
    // drop component state (the open tab, focus) on every change the form submits.
    protected override async _renderHTML(context: AmpSheetContext): Promise<HTMLElement> {
        if (this.#context && this.#root) {
            this.#context.set(context);
            return this.#root;
        }
        this.#context = new SheetContext(context);
        this.#root = document.createElement("div");
        this.#root.classList.add("sra2-sheet-root");
        this.#component = mount(AmpSheetView, {
            target: this.#root,
            props: { sheet: this.#context },
        });
        return this.#root;
    }

    protected override _replaceHTML(result: HTMLElement, content: HTMLElement): void {
        // Re-inserting the node it already holds would detach it and lose focus.
        if (result.parentElement !== content) content.replaceChildren(result);
    }

    protected override async _preClose(options: ApplicationClosingOptions): Promise<void> {
        await super._preClose(options);
        if (this.#component) void unmount(this.#component);
        this.#component = undefined;
        this.#context = undefined;
        this.#root = undefined;
    }
}
