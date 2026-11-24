/** Character derived-data rules: pure functions over the character's model and its items' models. */
import type { ModelPropsFromSchema } from "@common/data/fields.d.mts";
import type {
    CharacterArmorSchema,
    CharacterDerivedSchema,
    CharacterModel,
    InitiativeRealmSchema,
} from "@models/actor/character.ts";
import type { AmpModel } from "@models/item/amp/index.ts";
import type { MetatypeModel } from "@models/item/metatype.ts";
import { ATTRIBUTES, mapAttributes } from "@system/attributes.ts";
import { BASE_EDGE, COSTS } from "@system/constants.ts";
import { type Realm, REALMS } from "@system/enums.ts";

import { isAmpOfType } from "./amp.ts";
import { multipliedThresholds, steppedThresholds, trackBoxes } from "./damage.ts";
import { trackStats } from "./features/damage-track.ts";
import { applyModifiers, type StatSheet, statSheet } from "./stats/sheet.ts";
import type { StatBlock } from "./stats/types.ts";

/** A character's stats. Armor is three stats, combined by `computeArmor`. */
export const CHARACTER_STAT_BLOCK: StatBlock<unknown> = {
    ...trackStats(),
    "initiative.physical": { combine: "best" },
    "initiative.astral": { combine: "best" },
    "initiative.virtual": { combine: "best" },
    essenceLoss: {},
    /** One contribution per worn armor amp; they don't stack (see `computeArmor`). */
    wornArmor: {},
    shield: { combine: "best" },
    armorBonus: {},
};

/** Attribute cap when the character has no metatype. */
export const UNCAPPED_ATTRIBUTE = 99;

/** What the character rules read: the character's own data and what its items contribute. */
export interface CharacterRulesInput extends Pick<CharacterModel, "attributes" | "maxEssence"> {
    metatype: Pick<MetatypeModel, "maxAttributes" | "edge"> | null;
    /** Every amp on the actor (active or not), with its nuyen cost. */
    amps: readonly { name: string; system: AmpModel; cost: number }[];
    /** Nuyen cost of every other costed item (skills, specializations, knowledges). */
    otherItemCosts: readonly number[];
    /** Nuyen cost of each linked vehicle actor that could be resolved. */
    vehicleCosts: readonly number[];
}

/** Everything `computeCharacter` derives: the character model's derived fields. */
export type CharacterDerived = ModelPropsFromSchema<CharacterDerivedSchema>;
/** Initiative enhancement in one realm. */
export type CharacterInitiative = ModelPropsFromSchema<InitiativeRealmSchema>;
export type CharacterArmor = ModelPropsFromSchema<CharacterArmorSchema>;

/** What an initiative enhancement tier gives (tiers are cumulative). */
export function initiativeBenefits(tier: number): Omit<CharacterInitiative, "tier" | "source"> {
    return {
        edgePerActionScene: (tier >= 1 ? 1 : 0) + (tier >= 3 ? 1 : 0),
        canSpendEdgeForActions: tier >= 1,
        extraActionsPerNarration: tier >= 2 ? 1 : 0,
    };
}

/**
 * Armor from a character's stats. Armor amps don't stack with each other, but a shield and one "+1
 * armor" bonus stack on top of worn armor: each worn armor amp gives value + shield + bonus, and
 * the best applies. Without worn armor, the shield and bonus still count.
 */
export function computeArmor(stats: StatSheet): CharacterArmor {
    const shield = stats.total("shield");
    const bonus = stats.total("armorBonus");
    const perAmp = stats.contributions("wornArmor").map((c) => ({
        name: c.source,
        level: c.value + shield + bonus,
    }));
    const level = Math.max(shield + bonus, ...perAmp.map((a) => a.level));
    return { level, bonus, shield, perAmp };
}

/**
 * A character's stats and each active amp's own stats (empty for amps that hold none), after every
 * active amp's modifiers have gone to their targets.
 */
export function characterStats(activeAmps: readonly { name: string; system: AmpModel }[]): {
    character: StatSheet;
    amps: StatSheet[];
} {
    const character = statSheet(CHARACTER_STAT_BLOCK, null);
    const sources = activeAmps.map(({ name, system }) => ({
        name,
        modifiers: system.modifiers(),
        sheet: system.statSheet(),
    }));
    applyModifiers(character, sources);
    return { character, amps: sources.map((s) => s.sheet) };
}

/** Each attribute level costs 10k, except the level equal to the metatype maximum, which costs 20k. */
export function attributeCost(level: number, max: number): number {
    let cost = 0;
    for (let i = 1; i <= level; i++)
        cost += i === max ? COSTS.attributeMaxLevel : COSTS.attributeLevel;
    return cost;
}

export function computeCharacter(input: CharacterRulesInput): CharacterDerived {
    const attributeMax = input.metatype
        ? mapAttributes((a) => input.metatype!.maxAttributes[a] || UNCAPPED_ATTRIBUTE)
        : mapAttributes(() => UNCAPPED_ATTRIBUTE);
    const effective = mapAttributes((a) =>
        Math.min(Math.max(1, input.attributes[a]), attributeMax[a]),
    );
    const attributeCosts = mapAttributes((a) => attributeCost(effective[a], attributeMax[a]));

    const active = input.amps.filter((f) => f.system.active);
    const { character: stats, amps: ampStats } = characterStats(active);

    const initiative = Object.fromEntries(
        REALMS.map((realm) => {
            const best = stats.best(`initiative.${realm}`);
            const tier = best?.value ?? 0;
            return [realm, { tier, source: best?.source ?? "", ...initiativeBenefits(tier) }];
        }),
    ) as Record<Realm, CharacterInitiative>;

    const armor = computeArmor(stats);

    const physicalBase = effective.strength;
    const mentalBase = effective.willpower;

    // Only a cyberdeck (or the emerged virtual persona) protects the persona; firewall on equipment
    // or cyberware has no matrix effect.
    const deckStats = ampStats[active.findIndex((f) => isAmpOfType(f.system, "cyberdeck"))];
    const emerged = active.some((f) => isAmpOfType(f.system, "emerged"));
    const virtualPersona = emerged
        ? { firewall: effective.willpower, attack: effective.charisma }
        : null;
    const firewall = deckStats ? deckStats.total("firewall") : (virtualPersona?.firewall ?? 0);

    const ampCosts = active.reduce((n, f) => n + f.cost, 0);
    const totalCost =
        ATTRIBUTES.reduce((n, a) => n + attributeCosts[a], 0) +
        ampCosts +
        sum(input.otherItemCosts) +
        sum(input.vehicleCosts);

    return {
        effectiveAttributes: effective,
        attributeMax,
        attributeCosts,
        startingEdge: input.metatype?.edge ?? BASE_EDGE,
        initiative,
        damageBoxes: trackBoxes(
            stats.total("damageBoxes.light"),
            stats.total("damageBoxes.serious"),
        ),
        armor,
        thresholds: {
            physical: steppedThresholds(physicalBase),
            physicalArmored: steppedThresholds(physicalBase + armor.level),
            mental: steppedThresholds(mentalBase),
            matrix: multipliedThresholds(firewall),
        },
        essence: Math.max(0, input.maxEssence - stats.total("essenceLoss")),
        virtualPersona,
        totalCost,
    };
}

function sum(values: readonly number[]): number {
    return values.reduce((a, b) => a + b, 0);
}
