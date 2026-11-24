import type { ModelPropsFromSchema } from "@common/data/fields.d.mts";
import {
    type AmpEffect,
    extraBoxesOnSelf,
    type ExtraBoxesSchema,
    firewallField,
    flagEffect,
    matrixDevice,
    type MatrixDeviceSchema,
    perUnit,
} from "@system";
import {
    bool,
    type BoolField,
    int,
    type NumField,
    schema,
    type Schema,
} from "@system/schema/fields.ts";

import { type AmpBaseSchema, ampFields, AmpModel } from "./base.ts";

export type CyberdeckSchema = AmpBaseSchema &
    MatrixDeviceSchema &
    ExtraBoxesSchema & {
        /** Attack rating (+1 rating per point). */
        attackRating: NumField;
        /** The deck is currently link-locked (state of play, not a purchase). */
        linkLocked: BoolField;
        /** Programs the deck runs (+1 rating each). */
        programs: Schema<{
            biofeedback: BoolField;
            biofeedbackFilter: BoolField;
            lockdown: BoolField;
        }>;
    };

const PROGRAM_RATING_KEYS = {
    biofeedback: "cyberdeckBiofeedback",
    biofeedbackFilter: "cyberdeckBiofeedbackFilter",
    lockdown: "cyberdeckLockdown",
} as const;

const program = (key: keyof typeof PROGRAM_RATING_KEYS) =>
    flagEffect<CyberdeckModel>({
        key,
        ratingKey: PROGRAM_RATING_KEYS[key],
        on: (a) => a.programs[key],
        rating: 1,
    });

/**
 * A cyberdeck: a matrix device whose firewall protects its owner's persona. Damage boxes bought on
 * a deck extend its own track, not its owner's.
 */
// Schema fields are populated by DataModel at runtime; the merged interface only types them.
// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export class CyberdeckModel extends AmpModel<CyberdeckSchema> {
    static override readonly ampType = "cyberdeck";
    static override readonly kind = "gear";
    static override readonly features = [matrixDevice, extraBoxesOnSelf] as const;

    static override defineSchema(): CyberdeckSchema {
        return {
            ...ampFields(this.features),
            /** Decks start at firewall 1; other matrix devices start at 0. */
            firewall: firewallField(1),
            attackRating: int(0, { min: 0 }),
            linkLocked: bool(),
            programs: schema({
                biofeedback: bool(),
                biofeedbackFilter: bool(),
                lockdown: bool(),
            }),
        };
    }

    static override readonly effects: readonly AmpEffect<CyberdeckModel>[] = [
        program("biofeedback"),
        program("biofeedbackFilter"),
        program("lockdown"),
        perUnit<CyberdeckModel>({
            key: "attackRating",
            ratingKey: "attackRating",
            units: (a) => a.attackRating,
            rating: 1,
        }),
    ];
}

// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export interface CyberdeckModel extends ModelPropsFromSchema<CyberdeckSchema> {}
