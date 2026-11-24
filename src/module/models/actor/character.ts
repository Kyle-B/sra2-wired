import type { ModelPropsFromSchema } from "@common/data/fields.d.mts";
import { SRA2Actor } from "@documents/actor.ts";
import { migrateCharacter } from "@migration/legacy/index.ts";
import { SystemModel } from "@models/base.ts";
import {
    ASTRAL_STATES,
    type AstralState,
    BASE_ESSENCE,
    computeCharacter,
    type CharacterRulesInput,
    CONNECTION_MODES,
    type ConnectionMode,
    BASE_EDGE,
    type Realm,
} from "@system";
import {
    array,
    type ArrayOf,
    type BoolField,
    choice,
    type ChoiceField,
    derivedArray,
    derivedBool,
    derivedAttributes,
    derivedNullableSchema,
    derivedNum,
    derivedSchema,
    derivedStr,
    html,
    type HtmlField,
    int,
    num,
    type NullableSchema,
    type NumField,
    schema,
    type Schema,
    str,
    type StrField,
    uuidArray,
    type UuidArrayField,
} from "@system/schema/fields.ts";
import {
    type AttributesSchema,
    type DamageBoxesSchema,
    damageTrack,
    type DamageTrackSchema,
    derivedDamageBoxes,
    derivedThresholds,
    descriptionFields,
    type DescriptionSchema,
    type ThresholdsSchema,
} from "@system/schema/shared.ts";

import { mountedWeaponCosts } from "./vehicle.ts";

export type CharacterSchema = DescriptionSchema &
    CharacterDerivedSchema & {
        /** Attributes as set by the player. Rules use `effectiveAttributes`. */
        attributes: Schema<AttributesSchema>;
        nuyen: NumField;
        maxEssence: NumField;
        connectionMode: ChoiceField<ConnectionMode>;
        astralState: ChoiceField<AstralState>;
        /** Filled box counts; box totals are derived (`damageBoxes`). */
        damage: Schema<DamageTrackSchema>;
        /**
         * The character's single edge pool: starts at the metatype's edge level and goes up and
         * down in play (nothing resets it at the end of a scene).
         */
        edge: NumField;
        bio: Schema<{ background: HtmlField; notes: HtmlField }>;
        keywords: ArrayOf<StrField>;
        behaviors: ArrayOf<StrField>;
        catchphrases: ArrayOf<StrField>;
        /**
         * UUIDs of vehicle actors owned by this character; their cost counts toward the
         * character's.
         */
        linkedVehicles: UuidArrayField;
    };

/** Character data computed from the stored data and items (not persisted). See `computeCharacter`. */
export type CharacterDerivedSchema = {
    /** Attributes capped at the metatype maximums: what rolls and thresholds use. */
    effectiveAttributes: Schema<AttributesSchema>;
    attributeMax: Schema<AttributesSchema>;
    attributeCosts: Schema<AttributesSchema>;
    /** Edge a character of this metatype starts with (3 without a metatype). */
    startingEdge: NumField;
    /** Initiative enhancement in each realm: the best source applies, sources don't stack. */
    initiative: Schema<Record<Realm, Schema<InitiativeRealmSchema>>>;
    damageBoxes: Schema<DamageBoxesSchema>;
    armor: Schema<CharacterArmorSchema>;
    thresholds: Schema<{
        physical: Schema<ThresholdsSchema>;
        physicalArmored: Schema<ThresholdsSchema>;
        mental: Schema<ThresholdsSchema>;
        matrix: Schema<ThresholdsSchema>;
    }>;
    essence: NumField;
    /** Technomancer virtual persona, when an emerged amp is active; otherwise null. */
    virtualPersona: NullableSchema<{ firewall: NumField; attack: NumField }>;
    totalCost: NumField;
};

/** A character's armor (derived). */
export type CharacterArmorSchema = {
    /** Armor level used for the armored physical thresholds: the best of `perAmp`. */
    level: NumField;
    /** +1 from bonuses on other amps (0 or 1: bonuses never stack). */
    bonus: NumField;
    /** Best active shield's value (0 or 1); stacks on top of worn armor. */
    shield: NumField;
    /** Armor level each worn armor amp gives: its value + shield + bonus. */
    perAmp: ArrayOf<Schema<{ name: StrField; level: NumField }>>;
};

/** Initiative enhancement in one realm (derived). */
export type InitiativeRealmSchema = {
    /** Best tier in this realm (0 = none). */
    tier: NumField;
    /** The amp giving it, or "" when none. */
    source: StrField;
    /** Edge gained at the start of each action scene. */
    edgePerActionScene: NumField;
    /** May spend one edge per additional action. */
    canSpendEdgeForActions: BoolField;
    /** Extra actions in each narration. */
    extraActionsPerNarration: NumField;
};

function derivedInitiative() {
    return derivedSchema({
        tier: derivedNum(),
        source: derivedStr(),
        edgePerActionScene: derivedNum(),
        canSpendEdgeForActions: derivedBool(),
        extraActionsPerNarration: derivedNum(),
    } satisfies InitiativeRealmSchema);
}

// Schema fields are populated by DataModel at runtime; the merged interface only types them.
// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export class CharacterModel extends SystemModel<SRA2Actor, CharacterSchema> {
    static override defineSchema(): CharacterSchema {
        const attribute = () => int(1, { min: 1 });
        return {
            ...descriptionFields(),
            attributes: schema({
                strength: attribute(),
                agility: attribute(),
                willpower: attribute(),
                logic: attribute(),
                charisma: attribute(),
            }),
            nuyen: int(0, { min: 0 }),
            maxEssence: num(BASE_ESSENCE, { min: 0 }),
            connectionMode: choice(CONNECTION_MODES, "ar"),
            astralState: choice(ASTRAL_STATES, "physical"),
            damage: damageTrack(),
            edge: int(BASE_EDGE, { min: 0 }),
            bio: schema({
                background: html(),
                notes: html(),
            }),
            keywords: array(str()),
            behaviors: array(str()),
            catchphrases: array(str()),
            linkedVehicles: uuidArray("Actor"),

            effectiveAttributes: derivedAttributes(),
            attributeMax: derivedAttributes(),
            attributeCosts: derivedAttributes(),
            startingEdge: derivedNum(),
            initiative: derivedSchema({
                physical: derivedInitiative(),
                astral: derivedInitiative(),
                virtual: derivedInitiative(),
            }),
            damageBoxes: derivedDamageBoxes(),
            armor: derivedSchema({
                level: derivedNum(),
                bonus: derivedNum(),
                shield: derivedNum(),
                perAmp: derivedArray(derivedSchema({ name: derivedStr(), level: derivedNum() })),
            }),
            thresholds: derivedSchema({
                physical: derivedThresholds(),
                physicalArmored: derivedThresholds(),
                mental: derivedThresholds(),
                matrix: derivedThresholds(),
            }),
            essence: derivedNum(),
            virtualPersona: derivedNullableSchema({ firewall: derivedNum(), attack: derivedNum() }),
            totalCost: derivedNum(),
        };
    }

    static override migrateData(source: Record<string, unknown>): Record<string, unknown> {
        migrateCharacter(source);
        return super.migrateData(source);
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();
        const actor = this.parent;
        const metatype = actor.itemsOfType("metatype")[0]?.system ?? null;

        const input: CharacterRulesInput = {
            attributes: this.attributes,
            maxEssence: this.maxEssence,
            metatype,
            amps: actor
                .amps()
                .map((a) => ({ name: a.name, system: a.system, cost: a.system.cost })),
            otherItemCosts: [
                ...actor.itemsOfType("skill").map((i) => i.system.cost),
                ...actor.itemsOfType("specialization").map((i) => i.system.cost),
                ...actor.itemsOfType("knowledge").map((i) => i.system.cost),
            ],
            vehicleCosts: this.#linkedVehicleCosts(),
        };
        Object.assign(this, computeCharacter(input));
    }

    /**
     * Cost of each linked vehicle, computed from the vehicle's stored data so it does not depend on
     * whether the vehicle was prepared before this character. Unresolvable UUIDs (deleted actors,
     * unloaded compendium entries) contribute nothing.
     *
     * TODO: the character is not re-prepared when a linked vehicle changes, so its total cost can
     * be stale until the character itself is next prepared (e.g. on its own update or a reload).
     */
    #linkedVehicleCosts(): number[] {
        return this.linkedVehicles.flatMap((uuid) => {
            const doc = fromUuidSync(uuid);
            return doc instanceof SRA2Actor && doc.isType("vehicle")
                ? [doc.system.computeCost(mountedWeaponCosts(doc))]
                : [];
        });
    }
}

// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export interface CharacterModel extends ModelPropsFromSchema<CharacterSchema> {}
