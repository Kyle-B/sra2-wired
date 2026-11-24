<script lang="ts">
    import ProseMirror from "../../components/ProseMirror.svelte";
    import { t } from "../../i18n.ts";
    import type { SheetContext } from "../../sheet-context.svelte.ts";
    import type { AmpSheetContext } from "../amp-sheet.ts";

    let { sheet }: { sheet: SheetContext<AmpSheetContext> } = $props();

    const system = $derived(sheet.current.system);
    const enriched = $derived(sheet.current.enriched);
</script>

<fieldset>
    <legend>{t("SRA2.Description.description")}</legend>
    <ProseMirror
        name="system.description"
        value={system.description}
        enriched={enriched.description}
    />
</fieldset>

{#if sheet.current.user.isGM}
    <fieldset>
        <legend>{t("SRA2.Description.gmDescription")}</legend>
        <ProseMirror
            name="system.gmDescription"
            value={system.gmDescription}
            enriched={enriched.gmDescription}
        />
    </fieldset>
{/if}

<div class="form-group">
    <label for="{sheet.current.rootId}-reference">{t("SRA2.Description.reference")}</label>
    <input
        id="{sheet.current.rootId}-reference"
        type="text"
        name="system.reference"
        value={system.reference}
    />
</div>
