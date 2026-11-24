import { migrateAmpDocument } from "@migration/legacy/index.ts";
import { type AmpModel, ampModels } from "@models/item/amp/index.ts";
import type { AmpType } from "@system";

/**
 * Import an old sra2 feat source exactly as the item shim does, returning the resulting amp model
 * and the fields the import dropped.
 */
export function importLegacyAmp(source: Record<string, unknown>): {
    data: AmpModel;
    dropped: string[];
} {
    const doc: Record<string, unknown> = {
        type: "feat",
        name: "test",
        system: structuredClone(source),
    };
    const dropped = migrateAmpDocument(doc, () => {});
    const Model = ampModels[doc["type"] as AmpType] as unknown as new (data: object) => AmpModel;
    return { data: new Model(doc["system"] as object), dropped };
}
