import type { ModelPropsFromSchema } from "@common/data/fields.d.mts";

import { localMax, perUnit } from "../effects/amp-effect.ts";
import {
    bool,
    type BoolField,
    choice,
    type ChoiceField,
    derivedSchema,
    derivedStr,
    int,
    type NumField,
    schema,
    type Schema,
    str,
    type StrField,
} from "../schema/fields.ts";
import { damageValue, type DamageValueSchema } from "../schema/shared.ts";
import { DAMAGE_TYPES, type DamageType } from "../tables/weapons.ts";
import type { Feature } from "./feature.ts";

/** Attack profile: weapons, spells, complex forms, adept powers. Skill references are slugs. */
export type AttackSchema = {
    attack: Schema<{
        /** Damage value. */
        dv: Schema<DamageValueSchema>;
        /** Bought damage bonus (+1 rating each). */
        damageBonus: NumField;
        damageType: ChoiceField<DamageType>;
        skill: StrField;
        specialization: StrField;
        defenseSkill: StrField;
        defenseSpecialization: StrField;
        /** Counts as a magic test (essence penalties apply). */
        isMagic: BoolField;
    }>;

    // Derived (not persisted)
    /**
     * Skill and specialization slugs actually rolled: the stored ones, except for spells and
     * complex forms, whose type fixes them.
     */
    resolvedAttack: Schema<{ skill: StrField; specialization: StrField }>;
};

export type AttackData = ModelPropsFromSchema<AttackSchema>;

/** Skill and specialization slugs an attack is rolled with. */
export interface AttackSkills {
    skill: string;
    specialization: string;
}

/** Bought damage bonus on an attack. */
const damageBonusEffect = perUnit<AttackData>({
    key: "damageBonus",
    ratingKey: "damageBonus",
    units: (a) => a.attack.damageBonus,
    rating: 1,
    max: { local: 2 },
});

export const attack: Feature<AttackSchema> = {
    fields: () => ({
        attack: schema({
            dv: damageValue(),
            damageBonus: int(0, { min: 0, max: localMax(damageBonusEffect) }),
            damageType: choice(DAMAGE_TYPES, "physical"),
            skill: str(),
            specialization: str(),
            defenseSkill: str(),
            defenseSpecialization: str(),
            isMagic: bool(),
        }),
        resolvedAttack: derivedSchema({ skill: derivedStr(), specialization: derivedStr() }),
    }),
    effects: [damageBonusEffect],
    prepare: (a) => {
        a.resolvedAttack = { skill: a.attack.skill, specialization: a.attack.specialization };
    },
};
