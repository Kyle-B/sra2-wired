<script lang="ts">
    /**
     * Foundry's `<prose-mirror>` rich text editor, as a form input: it carries `name`, so saving it
     * submits through the sheet's form like any other input. Shown enriched until toggled to edit.
     */
    let { name, value, enriched }: { name: string; value: string; enriched: string } = $props();

    // Rebuilt only when the stored or enriched HTML changes, not on every sheet render, so an
    // editor that's open survives changes made elsewhere on the sheet.
    function editor(host: HTMLElement) {
        const element = foundry.applications.elements.HTMLProseMirrorElement.create({
            name,
            value,
            enriched,
            toggled: true,
            collaborate: false,
        });
        host.replaceChildren(element);
    }
</script>

<div class="prose-mirror-host" {@attach editor}></div>

<style>
    .prose-mirror-host {
        min-height: 8rem;
    }
    .prose-mirror-host :global(prose-mirror) {
        min-height: 8rem;
    }
</style>
