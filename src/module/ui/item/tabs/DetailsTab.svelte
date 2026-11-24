<script lang="ts">
    import { t } from "../../i18n.ts";
    import type { SheetContext } from "../../sheet-context.svelte.ts";
    import type { AmpSheetContext } from "../amp-sheet.ts";

    let { sheet }: { sheet: SheetContext<AmpSheetContext> } = $props();

    const system = $derived(sheet.current.system);
</script>

<!-- Feature sections (attack, cost tier, matrix device, …) will be listed here, one per feature. -->

<fieldset>
    <legend>{t("SRA2.Amp.general")}</legend>
    <div class="form-group">
        <label for="{sheet.current.rootId}-active">{t("SRA2.Amp.active")}</label>
        <input
            id="{sheet.current.rootId}-active"
            type="checkbox"
            name="system.active"
            checked={system.active}
        />
    </div>
</fieldset>

<fieldset>
    <legend>{t("SRA2.Amp.creation.label")}</legend>
    <div class="form-group">
        <label for="{sheet.current.rootId}-optional">{t("SRA2.Amp.creation.optional")}</label>
        <input
            id="{sheet.current.rootId}-optional"
            type="checkbox"
            name="system.creation.optional"
            checked={system.creation.optional}
        />
    </div>
    <div class="form-group">
        <label for="{sheet.current.rootId}-is-choice">{t("SRA2.Amp.creation.isChoice")}</label>
        <input
            id="{sheet.current.rootId}-is-choice"
            type="checkbox"
            name="system.creation.isChoice"
            checked={system.creation.isChoice}
        />
    </div>
    <div class="form-group">
        <label for="{sheet.current.rootId}-choice-count">
            {t("SRA2.Amp.creation.choiceCount")}
        </label>
        <input
            id="{sheet.current.rootId}-choice-count"
            type="number"
            min="1"
            step="1"
            name="system.creation.choiceCount"
            value={system.creation.choiceCount}
            disabled={!system.creation.isChoice}
        />
    </div>
</fieldset>
