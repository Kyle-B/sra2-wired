<script lang="ts">
    import { t } from "../../i18n.ts";
    import type { SheetContext } from "../../sheet-context.svelte.ts";
    import type { AmpSheetContext } from "../amp-sheet.ts";

    let { sheet }: { sheet: SheetContext<AmpSheetContext> } = $props();

    const system = $derived(sheet.current.system);
    const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);
</script>

<table class="breakdown">
    <thead>
        <tr>
            <th class="source">{t("SRA2.Rating.source")}</th>
            <th class="count">{t("SRA2.Rating.count")}</th>
            <th class="value">{t("SRA2.Rating.value")}</th>
        </tr>
    </thead>
    <tbody>
        {#each system.ratingBreakdown as entry, i (i)}
            <tr>
                <td class="source">{t(`SRA2.Rating.Keys.${entry.key}`)}</td>
                <td class="count">{entry.count ?? ""}</td>
                <td class="value">{signed(entry.value)}</td>
            </tr>
        {:else}
            <tr>
                <td class="empty" colspan="3">{t("SRA2.Rating.empty")}</td>
            </tr>
        {/each}
    </tbody>
    <tfoot>
        <tr>
            <th class="source" colspan="2">{t("SRA2.Amp.rating")}</th>
            <th class="value">{system.rating}</th>
        </tr>
        <tr>
            <th class="source" colspan="2">{t("SRA2.Amp.cost")}</th>
            <th class="value">{system.cost.toLocaleString(game.i18n.lang)}¥</th>
        </tr>
    </tfoot>
</table>

<style>
    .breakdown {
        width: 100%;
    }
    .count,
    .value {
        width: 5rem;
        text-align: right;
    }
    .source {
        text-align: left;
    }
    .empty {
        text-align: center;
        font-style: italic;
        opacity: 0.75;
    }
</style>
