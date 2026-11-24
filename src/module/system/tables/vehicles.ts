import type { ModelPropsFromSchema } from "@common/data/fields.d.mts";

import type { ChoiceField, NumField } from "../schema/fields.ts";

/** Sizes a weapon mount can have. */
export const MOUNT_SIZES = ["pistol", "smg", "rifle", "heavy"] as const;
export type MountSize = (typeof MOUNT_SIZES)[number];

/** A vehicle's standard mount size, or "none" when it has no mount. */
export const WEAPON_MOUNTS = ["none", ...MOUNT_SIZES] as const;
export type WeaponMount = (typeof WEAPON_MOUNTS)[number];

export const VEHICLE_CONTROL_MODES = ["autonomous", "manual", "rigged", "captain"] as const;
export type VehicleControlMode = (typeof VEHICLE_CONTROL_MODES)[number];

/** A vehicle's profile: its stats before upgrades (custom or a preset's), or after them. */
export type VehicleProfileSchema = {
    autopilot: NumField;
    structure: NumField;
    handling: NumField;
    speed: NumField;
    flyingSpeed: NumField;
    armor: NumField;
    weaponMount: ChoiceField<WeaponMount>;
};

/** A vehicle's stats, before or after upgrades. */
export type VehicleProfile = ModelPropsFromSchema<VehicleProfileSchema>;

const v = (
    structure: number,
    handling: number,
    speed: number,
    flyingSpeed: number,
    weaponMount: WeaponMount = "none",
): VehicleProfile => ({
    autopilot: 6,
    structure,
    handling,
    speed,
    flyingSpeed,
    armor: 0,
    weaponMount,
});

/** A vehicle preset: its profile before upgrades. */
export type VehiclePreset = VehicleProfile;

/** Vehicle/drone presets. "customVehicle" reads its profile from the actor instead. */
export const VEHICLE_PRESETS = {
    customVehicle: v(0, 0, 0, 0),
    microdrone: v(0, 10, 0, 1),
    minidrone: v(1, 10, 0, 1),
    smallDrone: v(1, 9, 2, 4, "smg"),
    mediumDrone: v(2, 7, 3, 6, "rifle"),
    largeDrone: v(4, 4, 4, 8, "rifle"),
    racingMotorcycle: v(4, 2, 6, 0, "rifle"),
    offroadMotorcycle: v(4, 3, 5, 0, "rifle"),
    chopper: v(5, 2, 5, 0, "rifle"),
    sportsCar: v(5, 2, 5, 0),
    sedan: v(6, 2, 4, 0),
    suvPickup: v(7, 1, 4, 0),
    van: v(8, 1, 3, 0),
    busTruck: v(10, 0, 2, 0),
    rigidInflatableBoat: v(5, 4, 3, 0),
    jetSki: v(5, 5, 2, 0),
    civilHelicopter: v(9, 4, 6, 0),
    vtol: v(10, 3, 6, 0),
    tBird: v(10, 3, 6, 0),
    gliderWing: v(3, 7, 0, 4),
} as const satisfies Record<string, VehiclePreset>;

export type VehicleType = keyof typeof VEHICLE_PRESETS;
export const VEHICLE_TYPE_KEYS = Object.keys(VEHICLE_PRESETS) as VehicleType[];

/** Autopilot can never exceed this, regardless of upgrades. */
export const AUTOPILOT_MAX = 12;

const NO_PROFILE: VehicleProfile = {
    autopilot: 0,
    structure: 0,
    handling: 0,
    speed: 0,
    flyingSpeed: 0,
    armor: 0,
    weaponMount: "none",
};

/**
 * A vehicle's profile before upgrades: its preset's, its custom one, or all 0 when no preset is
 * chosen yet.
 */
export function vehicleBaseProfile(
    vehicleType: VehicleType | null,
    customProfile: VehicleProfile,
): VehicleProfile {
    if (vehicleType === null) return NO_PROFILE;
    if (vehicleType === "customVehicle") return customProfile;
    return VEHICLE_PRESETS[vehicleType];
}
