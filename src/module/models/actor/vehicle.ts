/**
 * The vehicle: gear a character can have, represented as an actor so it has a presence on the
 * scene. It is rated like an amp: its upgrades and mounts are its effects; they price it and change
 * its own stats. Its RR is priced like an amp's; entries targeting a skill, specialization or
 * attribute benefit the owner's rolls, untargeted ones the vehicle's own (autopilot) rolls.
 */
import type { ModelPropsFromSchema } from "@common/data/fields.d.mts";
import type { SRA2Actor } from "@documents/actor.ts";
import { migrateVehicle } from "@migration/legacy/index.ts";
import { RatedModel } from "@models/rated-model.ts";
import {
    type AmpEffect,
    AUTOPILOT_MAX,
    COSTS,
    extraBoxesOnSelf,
    type ExtraBoxesSchema,
    featureFields,
    flagEffect,
    MOUNT_SIZES,
    type MountSize,
    multipliedThresholds,
    narrative,
    type NarrativeSchema,
    ownTrack,
    type OwnTrackSchema,
    perUnit,
    ratedFields,
    type RatedSchema,
    type RatingKey,
    rr,
    type RRSchema,
    type StatBlock,
    type StatSheet,
    VEHICLE_CONTROL_MODES,
    VEHICLE_TYPE_KEYS,
    type VehicleControlMode,
    type VehicleProfile,
    type VehicleProfileSchema,
    type VehicleType,
    vehicleBaseProfile,
    WEAPON_MOUNTS,
} from "@system";
import {
    array,
    type ArrayOf,
    bool,
    type BoolField,
    choice,
    type ChoiceField,
    derivedChoice,
    derivedNum,
    derivedSchema,
    int,
    nullableChoice,
    type NullableChoiceField,
    type NumField,
    schema,
    type Schema,
    str,
    type StrField,
} from "@system/schema/fields.ts";
import {
    derivedThresholds,
    descriptionFields,
    type DescriptionSchema,
    type ThresholdsSchema,
} from "@system/schema/shared.ts";

/** Upgrades a vehicle can buy: points of a stat, or a flag. See `UPGRADES`. */
export type VehicleUpgradesSchema = {
    autopilot: NumField;
    speed: NumField;
    handling: NumField;
    armor: NumField;
    additionalDrones: NumField;
    flying: BoolField;
    fixed: BoolField;
    autopilotUnlocked: BoolField;
};

export type VehicleSchema = DescriptionSchema &
    RatedSchema &
    OwnTrackSchema &
    ExtraBoxesSchema &
    RRSchema &
    NarrativeSchema & {
        /** Preset; null when not chosen yet (a profile of all 0). */
        vehicleType: NullableChoiceField<VehicleType>;
        controlMode: ChoiceField<VehicleControlMode>;
        /** Its profile, used only when vehicleType is "customVehicle". */
        customProfile: Schema<VehicleProfileSchema>;
        /** Bought upgrades; each changes the vehicle's price. */
        upgrades: Schema<VehicleUpgradesSchema>;
        /**
         * Weapon mounts. If the vehicle comes with a mount (its base profile's `weaponMount`), the
         * first is free; each additional mount is +1 rating. Each mount's free-form `cost` (rating)
         * prices its size and enhancements.
         */
        weaponMounts: ArrayOf<
            Schema<{ size: ChoiceField<MountSize>; enhancements: StrField; cost: NumField }>
        >;

        // Derived (not persisted)
        /** Profile before upgrades: the preset's, or `customProfile` for a custom vehicle. */
        baseProfile: Schema<VehicleProfileSchema>;
        /** Profile after upgrades: the vehicle's final stats. */
        stats: Schema<VehicleProfileSchema>;
        thresholds: Schema<ThresholdsSchema>;
        /** Nuyen cost: the base price, its rating, and the weapons mounted on it. */
        cost: NumField;
    };

/** The profile a vehicle's upgrades add to. */
const baseProfile = (v: Pick<VehicleModel, "vehicleType" | "customProfile">): VehicleProfile =>
    vehicleBaseProfile(v.vehicleType, v.customProfile);

type UpgradeKey = keyof VehicleUpgradesSchema;

/**
 * Vehicle upgrades: each adds to the vehicle's stat of the same name, `rating` per point (or when
 * on, for a flag), up to `max` points.
 */
const UPGRADES = {
    autopilot: { ratingKey: "autopilotUpgrade", rating: 1, max: 6 },
    speed: { ratingKey: "speedUpgrade", rating: 1, max: 3 },
    handling: { ratingKey: "handlingUpgrade", rating: 1, max: 3 },
    armor: { ratingKey: "armorUpgrade", rating: 1 },
    additionalDrones: { ratingKey: "additionalDrones", rating: 2, max: 3 },
    flying: { ratingKey: "flying", rating: 1, flag: true },
    fixed: { ratingKey: "fixed", rating: -1, flag: true },
    autopilotUnlocked: { ratingKey: "autopilotUnlocked", rating: 3, flag: true },
} as const satisfies {
    [K in UpgradeKey]: {
        ratingKey: RatingKey;
        rating: number;
    } & (VehicleUpgradesSchema[K] extends BoolField ? { flag: true } : { max?: number });
};

const upgradeEntries = Object.entries(UPGRADES) as [UpgradeKey, (typeof UPGRADES)[UpgradeKey]][];

function upgradeFields(): VehicleUpgradesSchema {
    return Object.fromEntries(
        upgradeEntries.map(([key, u]) => [
            key,
            "flag" in u ? bool() : int(0, "max" in u ? { min: 0, max: u.max } : { min: 0 }),
        ]),
    ) as VehicleUpgradesSchema;
}

/** One effect per upgrade, priced from the table and adding to the vehicle's own stat. */
const upgradeEffects = upgradeEntries.map(([stat, u]): AmpEffect<VehicleModel> => {
    const key = `vehicle${stat[0]!.toUpperCase()}${stat.slice(1)}`;
    const common = { key, ratingKey: u.ratingKey, rating: u.rating, stat, target: "self" } as const;
    return "flag" in u
        ? flagEffect<VehicleModel>({ ...common, on: (v) => v.upgrades[stat] === true })
        : perUnit<VehicleModel>({
              ...common,
              units: (v) => Number(v.upgrades[stat]),
              ...("max" in u ? { max: { local: u.max } } : {}),
          });
});

/**
 * Every mount past the free one (if the vehicle comes with a mount) is +1; plus each mount's own
 * cost.
 */
const weaponMountsEffect: AmpEffect<VehicleModel> = {
    key: "weaponMounts",
    rating: (v) => {
        const free = baseProfile(v).weaponMount === "none" ? 0 : 1;
        const extra = Math.max(0, v.weaponMounts.length - free);
        const costs = v.weaponMounts.reduce((n, m) => n + m.cost, 0);
        return [
            ...(extra ? [{ key: "extraMounts" as const, value: extra, count: extra }] : []),
            ...(costs
                ? [{ key: "mountCosts" as const, value: costs, count: v.weaponMounts.length }]
                : []),
        ];
    },
    modifiers: () => [],
};

/** A profile's fields: stored (a custom vehicle's) or derived (the base and upgraded profiles). */
function profileFields(stored: boolean): VehicleProfileSchema {
    const num = (initial = 0) => (stored ? int(initial, { min: 0 }) : derivedNum());
    return {
        autopilot: stored ? int(6, { min: 0, max: AUTOPILOT_MAX }) : derivedNum(),
        structure: num(),
        handling: num(),
        speed: num(),
        flyingSpeed: num(),
        armor: num(),
        weaponMount: stored ? choice(WEAPON_MOUNTS, "none") : derivedChoice(WEAPON_MOUNTS, "none"),
    };
}

// Schema fields are populated by DataModel at runtime; the merged interface only types them.
// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export class VehicleModel extends RatedModel<SRA2Actor, VehicleSchema> {
    static override readonly features = [ownTrack, extraBoxesOnSelf, rr, narrative] as const;

    static override defineSchema(): VehicleSchema {
        return {
            ...featureFields(this.features),
            ...descriptionFields(),
            ...ratedFields(),
            vehicleType: nullableChoice(VEHICLE_TYPE_KEYS),
            controlMode: choice(VEHICLE_CONTROL_MODES, "autonomous"),
            customProfile: schema(profileFields(true)),
            upgrades: schema(upgradeFields()),
            weaponMounts: array(
                schema({ size: choice(MOUNT_SIZES, "smg"), enhancements: str(), cost: int(0) }),
            ),
            baseProfile: derivedSchema(profileFields(false)),
            stats: derivedSchema(profileFields(false)),
            thresholds: derivedThresholds(),
            cost: derivedNum(),
        };
    }

    static override readonly effects: readonly AmpEffect<VehicleModel>[] = [
        ...upgradeEffects,
        weaponMountsEffect,
    ];

    /** Each upgraded stat starts from the base (preset or custom) profile's, where it has one. */
    static override readonly statBlock: StatBlock<VehicleModel> = Object.fromEntries(
        upgradeEntries.map(([stat]) => [
            stat,
            {
                base: (v: VehicleModel) => {
                    const profile = baseProfile(v);
                    return stat in profile ? Number(profile[stat as keyof VehicleProfile]) : 0;
                },
            },
        ]),
    );

    static override migrateData(source: Record<string, unknown>): Record<string, unknown> {
        migrateVehicle(source);
        return super.migrateData(source);
    }

    /**
     * Nuyen cost: the base price, its rating's, and its mounted weapons'. Computed from the stored
     * data, so another actor can price a vehicle whether or not it has been prepared.
     *
     * @param weaponCosts Nuyen cost of each weapon amp mounted on the vehicle.
     */
    computeCost(weaponCosts: readonly number[] = []): number {
        return (
            COSTS.vehicleBase +
            this.computeRating().rating * COSTS.vehicleRating +
            weaponCosts.reduce((n, c) => n + c, 0)
        );
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();
        this.cost = this.computeCost(this.parent ? mountedWeaponCosts(this.parent) : []);
    }

    /** The vehicle's own limits apply to the upgraded stats. */
    protected override prepareFromStats(own: StatSheet): void {
        const base = baseProfile(this);
        const total = own.total.bind(own);
        this.baseProfile = base;
        this.stats = {
            autopilot: Math.min(AUTOPILOT_MAX, total("autopilot")),
            structure: base.structure,
            handling: total("handling"),
            speed: total("fixed") ? 0 : total("speed"),
            // Flying speed only applies once the vehicle is flagged as flying.
            flyingSpeed: total("flying") ? Math.max(1, base.flyingSpeed) : 0,
            armor: Math.min(base.structure, total("armor")),
            weaponMount: base.weaponMount,
        };
        this.thresholds = multipliedThresholds(this.stats.structure, this.stats.armor);
    }
}

// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export interface VehicleModel extends ModelPropsFromSchema<VehicleSchema> {}

/**
 * Nuyen cost of each weapon mounted on `vehicle`, priced from the weapons' stored fields so it
 * works before they are prepared.
 */
export function mountedWeaponCosts(vehicle: SRA2Actor): number[] {
    return vehicle.itemsOfType("weapon").map((w) => w.system.computeCost());
}
