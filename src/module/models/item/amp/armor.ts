import type { ModelPropsFromSchema } from "@common/data/fields.d.mts";
import { type AmpEffect, ARMOR_MAX, COSTS, localMax, SHIELD_MAX, type StatSheet } from "@system";
import { bool, type BoolField, derivedNum, int, type NumField } from "@system/schema/fields.ts";

import { type AmpBaseSchema, ampFields, AmpModel } from "./base.ts";

export type ArmorSchema = AmpBaseSchema & {
    /** Armor value (2,500 nuyen per point). Armor amps don't stack with each other. */
    armor: NumField;
    /** A shield: capped at 1, but stacks on top of worn armor. */
    isShield: BoolField;

    // Derived (not persisted)
    /** Armor value after the shield cap. */
    effectiveArmor: NumField;
};

/** Effective armor value of an armor amp: shields are capped at {@link SHIELD_MAX}. */
export function armorValue(amp: { armor: number; isShield: boolean }): number {
    return amp.isShield ? Math.min(SHIELD_MAX, amp.armor) : amp.armor;
}

/** An armor amp's value is worn armor, or a shield (capped at 1) that stacks on top. */
const armorValueEffect: AmpEffect<{ armor: number; isShield: boolean }> = {
    key: "armorValue",
    max: { local: ARMOR_MAX },
    rating: () => [],
    modifiers: (a) =>
        a.isShield
            ? [{ stat: "shield", value: armorValue(a), target: "owner" }]
            : [{ stat: "wornArmor", value: a.armor, target: "owner" }],
};

// Schema fields are populated by DataModel at runtime; the merged interface only types them.
// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export class ArmorModel extends AmpModel<ArmorSchema> {
    static override readonly ampType = "armor";
    static override readonly kind = "gear";

    static override defineSchema(): ArmorSchema {
        return {
            ...ampFields([]),
            armor: int(0, { min: 0, max: localMax(armorValueEffect) }),
            isShield: bool(),
            effectiveArmor: derivedNum(),
        };
    }

    static override readonly effects: readonly AmpEffect<ArmorModel>[] = [armorValueEffect];

    /** The rating's price plus the armor's (per point of effective armor). */
    override computeCost(): number {
        return super.computeCost() + armorValue(this) * COSTS.armorPoint;
    }

    protected override prepareFromStats(_own: StatSheet): void {
        this.effectiveArmor = armorValue(this);
    }
}

// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export interface ArmorModel extends ModelPropsFromSchema<ArmorSchema> {}
