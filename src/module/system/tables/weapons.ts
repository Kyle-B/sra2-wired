import type { ModelPropsFromSchema } from "@common/data/fields.d.mts";
import type { DamageValueSchema } from "@system/schema/shared.ts";

import type { SkillSlug, SpecializationSlug } from "./skills.ts";

export const DAMAGE_MODES = ["fixed", "attribute", "toxin"] as const;
export type DamageMode = (typeof DAMAGE_MODES)[number];

/**
 * A damage value (DV): a fixed value, an attribute plus a modifier, or toxin damage (resolved by
 * the toxin's own rules).
 */
export type DamageValue = ModelPropsFromSchema<DamageValueSchema>;

export const DAMAGE_TYPES = ["physical", "mental", "matrix", "biofeedback"] as const;
export type DamageType = (typeof DAMAGE_TYPES)[number];

/** How usable a weapon is at a given range band. */
export const RANGE_USABILITY = ["none", "ok", "disadvantage"] as const;
export type RangeUsability = (typeof RANGE_USABILITY)[number];

export const RANGE_BANDS = ["close", "short", "medium", "long"] as const;
export type RangeBand = (typeof RANGE_BANDS)[number];

export interface WeaponPreset {
    dv: DamageValue;
    ranges: Record<RangeBand, RangeUsability>;
    skill: SkillSlug;
    /** The specialization it is rolled with, or "" when that varies from weapon to weapon. */
    specialization: SpecializationSlug | "";
    defenseSkill: SkillSlug;
    defenseSpecialization: SpecializationSlug;
}

const fixed = (value: number): DamageValue => ({ mode: "fixed", value, attribute: null });
const str = (value = 0): DamageValue => ({ mode: "attribute", value, attribute: "strength" });
const toxin: DamageValue = { mode: "toxin", value: 0, attribute: null };

type R = RangeUsability;
const ranges = (close: R, short: R, medium: R, long: R) => ({ close, short, medium, long });

const melee = (
    dv: DamageValue,
    specialization: SpecializationSlug | "",
    r = ranges("ok", "none", "none", "none"),
) =>
    ({
        dv,
        ranges: r,
        skill: "closeCombat",
        specialization,
        defenseSkill: "closeCombat",
        defenseSpecialization: "spec_defense",
    }) satisfies WeaponPreset;

const ranged = (
    dv: DamageValue,
    specialization: SpecializationSlug | "",
    r: WeaponPreset["ranges"],
) =>
    ({
        dv,
        ranges: r,
        skill: "rangedWeapons",
        specialization,
        defenseSkill: "athletics",
        defenseSpecialization: "spec_rangedDefense",
    }) satisfies WeaponPreset;

/** Weapon presets: base DV, range usability and the recommended attack/defense skills. */
export const WEAPON_PRESETS = {
    customWeapon: ranged(fixed(0), "", ranges("none", "none", "none", "none")),
    // Close combat
    bareHands: melee(str(), "spec_unarmed"),
    // The specialization of these varies from weapon to weapon.
    shortWeapons: melee(str(1), ""),
    longWeapons: melee(str(2), ""),
    advancedMelee: melee(fixed(5), ""),
    tasers: melee(fixed(5), "", ranges("ok", "ok", "none", "none")),
    // Thrown
    throwing: ranged(str(1), "spec_throwingWeapons", ranges("ok", "ok", "disadvantage", "none")),
    grenades: ranged(fixed(7), "spec_throwingWeapons", ranges("ok", "ok", "disadvantage", "none")),
    gasGrenades: ranged(toxin, "spec_throwingWeapons", ranges("ok", "ok", "disadvantage", "none")),
    // Bows (the old presets used spec_thrown-weapons, as the packs had no archery specialization)
    bows: ranged(str(1), "spec_archery", ranges("ok", "ok", "ok", "none")),
    crossbows: ranged(fixed(4), "spec_archery", ranges("ok", "ok", "ok", "none")),
    // Pistols
    holdoutPistols: ranged(fixed(3), "spec_pistols", ranges("ok", "ok", "disadvantage", "none")),
    lightPistols: ranged(fixed(4), "spec_pistols", ranges("ok", "ok", "disadvantage", "none")),
    machinePistols: ranged(fixed(4), "spec_pistols", ranges("ok", "ok", "disadvantage", "none")),
    heavyPistols: ranged(fixed(5), "spec_pistols", ranges("ok", "ok", "disadvantage", "none")),
    // SMGs & rifles
    smgs: ranged(fixed(5), "spec_smgs", ranges("disadvantage", "ok", "ok", "none")),
    assaultRifles: ranged(
        fixed(7),
        "spec_rifles",
        ranges("disadvantage", "ok", "ok", "disadvantage"),
    ),
    shotguns: ranged(fixed(8), "spec_rifles", ranges("disadvantage", "ok", "disadvantage", "none")),
    sniperRifles: ranged(
        fixed(10),
        "spec_rifles",
        ranges("none", "disadvantage", "disadvantage", "ok"),
    ),
    // Heavy
    grenadeLaunchers: ranged(
        fixed(7),
        "spec_grenadeLaunchers",
        ranges("none", "disadvantage", "ok", "disadvantage"),
    ),
    machineGuns: ranged(fixed(9), "spec_heavyWeapons", ranges("none", "ok", "ok", "ok")),
    rocketLaunchers: ranged(
        fixed(12),
        "spec_heavyWeapons",
        ranges("none", "none", "disadvantage", "ok"),
    ),
} as const satisfies Record<string, WeaponPreset>;

export type WeaponType = keyof typeof WEAPON_PRESETS;
export const WEAPON_TYPE_KEYS = Object.keys(WEAPON_PRESETS) as WeaponType[];
