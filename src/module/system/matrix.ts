import type { IceType } from "@system/enums.ts";

import type { DamageType } from "./tables/weapons.ts";

/** ICE always have firewall 1. */
export const ICE_FIREWALL = 1;

/** The ICE that deal damage: their DV from the host rating, and the type of damage. */
export const ICE_ATTACKS: Readonly<
    Partial<Record<IceType, { dv: (hostRating: number) => number; damageType: DamageType }>>
> = {
    blaster: { dv: (rating) => Math.ceil(rating / 2), damageType: "matrix" },
    black: { dv: (rating) => Math.ceil(rating / 2), damageType: "biofeedback" },
    killer: { dv: (rating) => rating, damageType: "matrix" },
};

/** A host's effective rating (and firewall): physical security adds 1. */
export function effectiveHostRating(hostRating: number, physicalSecurity: boolean): number {
    return hostRating + (physicalSecurity ? 1 : 0);
}
