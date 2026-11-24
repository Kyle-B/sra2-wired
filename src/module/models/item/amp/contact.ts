import type { ModelPropsFromSchema } from "@common/data/fields.d.mts";
import { str, type StrField } from "@system/schema/fields.ts";

import { type AmpBaseSchema, ampFields, AmpModel } from "./base.ts";

export type ContactSchema = AmpBaseSchema & {
    /** Name of the contact the amp represents. */
    contactName: StrField;
};

// Schema fields are populated by DataModel at runtime; the merged interface only types them.
// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export class ContactModel extends AmpModel<ContactSchema> {
    static override readonly ampType = "contact";
    static override readonly kind = "trait";

    static override defineSchema(): ContactSchema {
        return { ...ampFields([]), contactName: str() };
    }
}

// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export interface ContactModel extends ModelPropsFromSchema<ContactSchema> {}
