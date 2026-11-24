/** What the rest of the rules need to know about amps, without depending on the amp models. */
import type { AmpModel, AmpSystemMap } from "@models/item/amp/index.ts";

import type { AmpType } from "./enums.ts";

/**
 * Traits are what a character is (qualities, awakened, bioware, contacts, …); gear is what it has
 * (equipment, cyberware, decks, weapons, armor). Gear can hold stats of its own.
 */
export const AMP_KINDS = ["trait", "gear"] as const;
export type AmpKind = (typeof AMP_KINDS)[number];

/** Type guard: is `amp` an amp of `type`? */
export function isAmpOfType<T extends AmpType>(amp: AmpModel, type: T): amp is AmpSystemMap[T] {
    return amp.ampType === type;
}
