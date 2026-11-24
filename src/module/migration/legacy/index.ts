/**
 * Import shims for data from the old `sra2` system. Kept separate from sra2-wired's own version
 * migrations (which will live in `migration/`): these convert the _old system's_ shapes only.
 *
 * Each `migrate*` function is called from the matching TypeDataModel's or document's `static
 * migrateData`, which Foundry runs on source data when it is read from disk, and on every update
 * delta before it is applied. They must therefore be idempotent and cheap, and leave partial deltas
 * (no `type`, only the changed keys) alone: each one checks for a legacy-only key or the item type
 * and returns immediately otherwise. They mutate `source` in place (as `migrateData` expects) and
 * delete the legacy keys they consume. Whether a document's shim runs before or after its system
 * data model's is not relied on. Pure: no Foundry globals, so they can be unit tested against real
 * old exports.
 */
export * from "./actors.ts";
export * from "./amps.ts";
export * from "./documents.ts";
export * from "./items.ts";
// Public conversions only; the coercion helpers in shared.ts stay internal to the shims.
export {
    isLegacyTrack,
    legacyDamageTrack,
    legacyNarrativeEffects,
    legacyRREntries,
    resolveAttributeRef,
    resolveSkillRef,
    resolveSpecializationRef,
} from "./shared.ts";
