/** Amp data models: one per amp type, each declaring its schema, features and effects. */
import type { AmpType } from "@system";

import { AdeptPowerModel } from "./adept-power.ts";
import { ArmorModel } from "./armor.ts";
import { AwakenedModel } from "./awakened.ts";
import { BiowareModel } from "./bioware.ts";
import { ComplexFormModel } from "./complex-form.ts";
import { ContactModel } from "./contact.ts";
import { CyberdeckModel } from "./cyberdeck.ts";
import { CyberwareModel } from "./cyberware.ts";
import { EmergedModel } from "./emerged.ts";
import { EquipmentModel } from "./equipment.ts";
import { PowerModel } from "./power.ts";
import { QualityModel } from "./quality.ts";
import { SpellModel } from "./spell.ts";
import { WeaponModel } from "./weapon.ts";

/** Every amp type's data model, keyed by its Item sub-type. */
export const ampModels = {
    quality: QualityModel,
    contact: ContactModel,
    awakened: AwakenedModel,
    adeptPower: AdeptPowerModel,
    equipment: EquipmentModel,
    armor: ArmorModel,
    cyberware: CyberwareModel,
    bioware: BiowareModel,
    cyberdeck: CyberdeckModel,
    weapon: WeaponModel,
    spell: SpellModel,
    emerged: EmergedModel,
    complexForm: ComplexFormModel,
    power: PowerModel,
} as const satisfies { [K in AmpType]: { readonly ampType: K } };

/** Amp sub-type → its system data model instance type. */
export type AmpSystemMap = { [K in AmpType]: InstanceType<(typeof ampModels)[K]> };

export * from "./adept-power.ts";
export * from "./armor.ts";
export * from "./awakened.ts";
export * from "./base.ts";
export * from "./bioware.ts";
export * from "./complex-form.ts";
export * from "./contact.ts";
export * from "./cyberdeck.ts";
export * from "./cyberware.ts";
export * from "./emerged.ts";
export * from "./equipment.ts";
export * from "./power.ts";
export * from "./quality.ts";
export * from "./spell.ts";
export * from "./weapon.ts";
