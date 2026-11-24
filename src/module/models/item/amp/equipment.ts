import type { ModelPropsFromSchema } from "@common/data/fields.d.mts";
import {
    type AmpEffect,
    armorBonus,
    type ArmorBonusSchema,
    COSTS,
    costTier,
    type CostTierSchema,
    flagEffect,
    optionalMatrixDevice,
    type OptionalMatrixDeviceSchema,
    perUnit,
    spellSupport,
    type SpellSupportSchema,
    WEAPON_TYPE_KEYS,
    type WeaponType,
} from "@system";
import {
    bool,
    type BoolField,
    choice,
    type ChoiceField,
    int,
    type NumField,
    schema,
    type Schema,
} from "@system/schema/fields.ts";

import { type AmpBaseSchema, ampFields, AmpModel } from "./base.ts";

export type EquipmentSchema = AmpBaseSchema &
    CostTierSchema &
    OptionalMatrixDeviceSchema &
    ArmorBonusSchema &
    SpellSupportSchema & {
        /** Rigger command consoles: drones controllable at once (+1 rating each). */
        riggerConsoles: NumField;
        /** Vehicle control wiring (+2 rating). */
        vehicleControlWiring: BoolField;
        /** +damage to every weapon of `weaponType` the owner uses (+1 rating per point). */
        weaponDamage: Schema<{ value: NumField; weaponType: ChoiceField<WeaponType> }>;
    };

// Schema fields are populated by DataModel at runtime; the merged interface only types them.
// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export class EquipmentModel extends AmpModel<EquipmentSchema> {
    static override readonly ampType = "equipment";
    static override readonly kind = "gear";
    static override readonly features = [
        costTier,
        optionalMatrixDevice,
        armorBonus,
        spellSupport,
    ] as const;

    static override defineSchema(): EquipmentSchema {
        return {
            ...ampFields(this.features),
            riggerConsoles: int(0, { min: 0 }),
            vehicleControlWiring: bool(),
            weaponDamage: schema({
                value: int(0, { min: 0 }),
                weaponType: choice(WEAPON_TYPE_KEYS, "customWeapon"),
            }),
        };
    }

    static override readonly effects: readonly AmpEffect<EquipmentModel>[] = [
        perUnit<EquipmentModel>({
            key: "riggerConsoles",
            ratingKey: "riggerConsoles",
            units: (a) => a.riggerConsoles,
            rating: 1,
            stat: "riggerConsoles",
        }),
        flagEffect<EquipmentModel>({
            key: "vehicleControlWiring",
            ratingKey: "vehicleControlWiring",
            on: (a) => a.vehicleControlWiring,
            rating: 2,
            stat: "vehicleControlWiring",
        }),
        perUnit<EquipmentModel>({
            key: "weaponDamageBonus",
            ratingKey: "weaponDamageBonus",
            units: (a) => a.weaponDamage.value,
            rating: 1,
            stat: "weaponDamage",
        }),
    ];

    /** The rating's price plus the price tier's. */
    override computeCost(): number {
        return super.computeCost() + COSTS.equipmentTier[this.costTier];
    }
}

// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export interface EquipmentModel extends ModelPropsFromSchema<EquipmentSchema> {}
