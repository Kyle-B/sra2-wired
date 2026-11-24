import type { ModelPropsFromSchema } from "@common/data/fields.d.mts";
import type { SRA2Actor } from "@documents/actor.ts";
import { migrateServer } from "@migration/legacy/index.ts";
import { SystemModel } from "@models/base.ts";
import { DEFAULT_HOST_RATING, effectiveHostRating, HOST_RATING_RANGE } from "@system";
import {
    bool,
    type BoolField,
    derivedNum,
    int,
    type NumField,
    uuidArray,
    type UuidArrayField,
} from "@system/schema/fields.ts";
import { descriptionFields, type DescriptionSchema } from "@system/schema/shared.ts";

export type ServerSchema = DescriptionSchema & {
    hostRating: NumField;
    physicalSecurity: BoolField;
    /** UUIDs of the ICE actors guarding this server. */
    linkedIce: UuidArrayField;

    // Derived (not persisted)
    /** Host rating including the physical-security bonus; also the server's firewall. */
    effectiveHostRating: NumField;
};

// Schema fields are populated by DataModel at runtime; the merged interface only types them.
// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export class ServerModel extends SystemModel<SRA2Actor, ServerSchema> {
    static override defineSchema(): ServerSchema {
        return {
            ...descriptionFields(),
            hostRating: int(DEFAULT_HOST_RATING, HOST_RATING_RANGE),
            physicalSecurity: bool(),
            linkedIce: uuidArray("Actor"),
            effectiveHostRating: derivedNum(),
        };
    }

    static override migrateData(source: Record<string, unknown>): Record<string, unknown> {
        migrateServer(source);
        return super.migrateData(source);
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();
        this.effectiveHostRating = effectiveHostRating(this.hostRating, this.physicalSecurity);
    }
}

// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export interface ServerModel extends ModelPropsFromSchema<ServerSchema> {}
