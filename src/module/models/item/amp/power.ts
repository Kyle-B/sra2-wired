import type { ModelPropsFromSchema } from "@common/data/fields.d.mts";

import { type AmpBaseSchema, ampFields, AmpModel } from "./base.ts";

export type PowerSchema = AmpBaseSchema;

/** Power amps have only the fields every amp has. Possibly unused (kept for old data); a trait. */
// Schema fields are populated by DataModel at runtime; the merged interface only types them.
// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export class PowerModel extends AmpModel<PowerSchema> {
    static override readonly ampType = "power";
    static override readonly kind = "trait";

    static override defineSchema(): PowerSchema {
        return ampFields([]);
    }
}

// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export interface PowerModel extends ModelPropsFromSchema<PowerSchema> {}
