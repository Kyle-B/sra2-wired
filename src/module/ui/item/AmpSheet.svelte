<script lang="ts">
    import { t } from "../i18n.ts";
    import type { SheetContext } from "../sheet-context.svelte.ts";
    import type { AmpSheetContext } from "./amp-sheet.ts";
    import DescriptionTab from "./tabs/DescriptionTab.svelte";
    import DetailsTab from "./tabs/DetailsTab.svelte";
    import RatingTab from "./tabs/RatingTab.svelte";

    let { sheet }: { sheet: SheetContext<AmpSheetContext> } = $props();

    const TABS = [
        { id: "details", label: "SRA2.Sheet.Tabs.details" },
        { id: "rating", label: "SRA2.Sheet.Tabs.rating" },
        { id: "description", label: "SRA2.Sheet.Tabs.description" },
    ] as const;
    type TabId = (typeof TABS)[number]["id"];

    let tab: TabId = $state("details");

    const item = $derived(sheet.current.item);
    const system = $derived(sheet.current.system);
</script>

<header class="sheet-header">
    <img
        class="profile"
        src={item.img}
        alt={item.name}
        data-action="editImage"
        data-edit="img"
        data-tooltip={t("SRA2.Sheet.editImage")}
    />
    <div class="identity">
        <input class="name" type="text" name="name" value={item.name} placeholder={t("Name")} />
        <span class="amp-type">{t(`TYPES.Item.${item.type}`)}</span>
    </div>
    <div class="rating" data-tooltip={t("SRA2.Amp.rating")}>
        <span class="value">{system.rating}</span>
        <span class="label">{t("SRA2.Amp.rating")}</span>
    </div>
</header>

<nav class="sheet-tabs tabs">
    {#each TABS as { id, label } (id)}
        <button
            type="button"
            class="item"
            class:active={tab === id}
            role="tab"
            aria-selected={tab === id}
            onclick={() => (tab = id)}
        >
            {t(label)}
        </button>
    {/each}
</nav>

<section class="sheet-body">
    {#if tab === "details"}
        <DetailsTab {sheet} />
    {:else if tab === "rating"}
        <RatingTab {sheet} />
    {:else}
        <DescriptionTab {sheet} />
    {/if}
</section>

<style>
    .sheet-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding-bottom: 0.5rem;
    }
    .profile {
        width: 64px;
        height: 64px;
        flex: none;
        object-fit: cover;
        border: none;
        cursor: pointer;
    }
    .identity {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }
    .name {
        font-size: var(--font-size-24, 1.5rem);
        height: auto;
    }
    .amp-type {
        font-size: var(--font-size-12, 0.75rem);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        opacity: 0.75;
    }
    .rating {
        flex: none;
        display: flex;
        flex-direction: column;
        align-items: center;
        min-width: 4rem;
        padding: 0.25rem 0.5rem;
        border: 1px solid var(--sra2-wired-accent);
        border-radius: 4px;
    }
    .rating .value {
        font-size: var(--font-size-24, 1.5rem);
        font-weight: bold;
    }
    .rating .label {
        font-size: var(--font-size-11, 0.7rem);
        text-transform: uppercase;
    }
    .sheet-body {
        padding-top: 0.5rem;
    }
</style>
