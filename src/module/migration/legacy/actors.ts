/** Legacy import: character, vehicle, ICE and server system data. */
import { type MountSize, VEHICLE_PRESETS, type WeaponMount } from "@system";

import {
    type Source,
    isObject,
    num,
    text,
    flag,
    camelKey,
    take,
    drop,
    into,
    isLegacyTrack,
    countTrue,
    isUuidLike,
    legacyDamageTrack,
    legacyRREntries,
    legacyNarrativeEffects,
} from "./shared.ts";

/* -------------------------------------------- */
/*  Actors                                      */
/* -------------------------------------------- */

function numberedToArray(group: unknown, prefix: string): string[] {
    if (Array.isArray(group)) return group.map((v) => text(v));
    if (!isObject(group)) return [];
    return Object.keys(group)
        .filter((k) => k.startsWith(prefix))
        .sort((a, b) => Number(a.slice(prefix.length)) - Number(b.slice(prefix.length)))
        .map((k) => text(group[k]))
        .filter((v) => v.trim() !== "");
}

export function migrateCharacter(source: Source): void {
    if (isLegacyTrack(source["damage"])) source["damage"] = legacyDamageTrack(source["damage"]);
    // Old connection modes were kebab-case (`cold-sim`).
    if ("connectionMode" in source) source["connectionMode"] = camelKey(source["connectionMode"]);

    // Anarchy (edge) was a max with spent boxes, plus temporary anarchy; it is now one pool. The
    // old box array was sized to the character's max, so the pool is what was left unspent.
    if ("anarchyNimbus" in source && !("anarchySpent" in source))
        source["anarchySpent"] = source["anarchyNimbus"];
    if (Array.isArray(source["anarchySpent"])) {
        const boxes = source["anarchySpent"];
        const temporary = num(source["tempAnarchy"]) - countTrue(source["tempAnarchySpent"]);
        source["edge"] = boxes.length - countTrue(boxes) + Math.max(0, temporary);
    }
    drop(source, ["anarchySpent", "tempAnarchy", "tempAnarchySpent"]);

    if (isObject(source["resources"])) {
        const resources = source["resources"];
        if (!("nuyen" in source) && "yens" in resources) source["nuyen"] = num(resources["yens"]);
        delete source["resources"];
    }

    for (const [key, prefix] of [
        ["keywords", "keyword"],
        ["behaviors", "behavior"],
        ["catchphrases", "catchphrase"],
    ] as const) {
        if (isObject(source[key])) source[key] = numberedToArray(source[key], prefix);
    }

    // The GM description sat under `bio`; every actor now has it at the top level.
    const bio = source["bio"];
    if (isObject(bio) && "gmDescription" in bio) {
        if (!("gmDescription" in source)) source["gmDescription"] = bio["gmDescription"];
        delete bio["gmDescription"];
    }

    if (Array.isArray(source["linkedVehicles"]))
        source["linkedVehicles"] = source["linkedVehicles"].filter(isUuidLike);

    // `gender` held "random" as an NPC-generator instruction; characters no longer store a gender.
    drop(source, ["armorLevel", "damageGaugeType", "anarchyNimbus", "gender"]);
}

export function migrateVehicle(source: Source): void {
    if (isLegacyTrack(source["damage"])) source["damage"] = legacyDamageTrack(source["damage"]);
    if (source["vehicleType"] === "") source["vehicleType"] = null;
    // Old preset keys were kebab-case (`medium-drone`).
    if ("vehicleType" in source) source["vehicleType"] = camelKey(source["vehicleType"]);
    if ("rrList" in source) {
        source["rr"] = legacyRREntries(source["rrList"]);
        delete source["rrList"];
    }
    if (Array.isArray(source["narrativeEffects"])) {
        // The old vehicle cost counted bare-string effects as +1.
        source["narrativeEffects"] = legacyNarrativeEffects(source["narrativeEffects"], 1);
    }
    into(
        source,
        "customProfile",
        take(source, [
            ["customAutopilot", "autopilot"],
            ["customStructure", "structure"],
            ["customHandling", "handling"],
            ["customSpeed", "speed"],
            ["customFlyingSpeed", "flyingSpeed"],
            ["customArmor", "armor"],
            ["customWeaponMount", "weaponMount"],
        ]),
    );
    into(
        source,
        "upgrades",
        take(source, [
            ["autopilotBonus", "autopilot"],
            ["speedBonus", "speed"],
            ["handlingBonus", "handling"],
            ["armorBonus", "armor"],
            ["isFixed", "fixed"],
            ["isFlying", "flying"],
            "autopilotUnlocked",
            ["additionalDroneCount", "additionalDrones"],
        ]),
    );
    // `weaponMount` was a derived value that leaked into source.
    if (typeof source["weaponMount"] === "string") delete source["weaponMount"];
    // Free-text weapon notes; weapon mounts are structured now.
    delete source["weaponInfo"];
    migrateWeaponMounts(source);
}

/** Old one-step mount size improvement (+1 level). */
const IMPROVED_MOUNT: Record<WeaponMount, MountSize> = {
    none: "smg",
    pistol: "smg",
    smg: "rifle",
    rifle: "rifle",
    heavy: "heavy",
};

/**
 * Vehicles used to have one mount (the preset's or custom profile's size) and a +1 "improve mount
 * size" upgrade; they now have a list of mounts. Build the list so the vehicle keeps its old cost:
 * a vehicle with a mount gets it as its free first mount (at the improved size, costing 1, if it
 * had the upgrade); a vehicle without one that had the upgrade gets an smg mount, paid by the +1
 * for an extra mount.
 *
 * Runs only when the old `weaponMountImprovement` flag is present, so partial updates are never
 * touched.
 */
function migrateWeaponMounts(source: Source): void {
    if (!("weaponMountImprovement" in source)) return;
    const improved = flag(source["weaponMountImprovement"]);
    delete source["weaponMountImprovement"];
    if ("weaponMounts" in source) return;

    const type = source["vehicleType"];
    const custom = isObject(source["customProfile"]) ? source["customProfile"] : {};
    const base: WeaponMount =
        type === "customVehicle"
            ? ((custom["weaponMount"] as WeaponMount | undefined) ?? "none")
            : typeof type === "string" && type in VEHICLE_PRESETS
              ? VEHICLE_PRESETS[type as keyof typeof VEHICLE_PRESETS].weaponMount
              : "none";
    const mount = (size: MountSize, cost: number) => ({ size, enhancements: "", cost });
    if (base !== "none") {
        source["weaponMounts"] = [improved ? mount(IMPROVED_MOUNT[base], 1) : mount(base, 0)];
    } else {
        source["weaponMounts"] = improved ? [mount("smg", 0)] : [];
    }
}

/** Old ICE type keys → current ones. */
const ICE_TYPE_RENAMES: Record<string, string> = {
    blocker: "jammer",
    glue: "tar",
    tracker: "track",
};

/** The old server index is the host rating now. */
function serverIndexToHostRating(source: Source): void {
    if (!("serverIndex" in source)) return;
    if (!("hostRating" in source)) source["hostRating"] = source["serverIndex"];
    delete source["serverIndex"];
}

export function migrateIce(source: Source): void {
    serverIndexToHostRating(source);
    if (isLegacyTrack(source["damage"])) source["damage"] = legacyDamageTrack(source["damage"]);
    if (source["iceType"] === "") source["iceType"] = null;
    if (typeof source["iceType"] === "string") {
        source["iceType"] = ICE_TYPE_RENAMES[source["iceType"]] ?? source["iceType"];
    }
}

export function migrateServer(source: Source): void {
    serverIndexToHostRating(source);
    if ("linkedICE" in source) {
        source["linkedIce"] = Array.isArray(source["linkedICE"])
            ? source["linkedICE"].filter(isUuidLike)
            : [];
        delete source["linkedICE"];
    }
}
