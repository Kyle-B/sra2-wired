/** Sub-schemas shared by several data models. Call the builders only from `defineSchema()`. */
import { ATTRIBUTES, type Attribute } from "../attributes.ts";
import { BASE_DAMAGE_BOXES, RR_MAX } from "../constants.ts";
import { RR_TYPES, type RRType } from "../enums.ts";
import { DAMAGE_MODES, type DamageMode } from "../tables/weapons.ts";
import {
    array,
    type ArrayOf,
    bool,
    type BoolField,
    choice,
    type ChoiceField,
    derivedNum,
    derivedSchema,
    html,
    type HtmlField,
    int,
    nullableChoice,
    type NullableChoiceField,
    type NumField,
    schema,
    type Schema,
    str,
    type StrField,
} from "./fields.ts";

/* -------------------------------------------- */
/*  Types                                       */
/* -------------------------------------------- */

/** Description fields every SRA2 actor and item carries. */
export type DescriptionSchema = {
    description: HtmlField;
    /** Notes only the GM sees. */
    gmDescription: HtmlField;
    /** Book/page reference, free text. */
    reference: StrField;
};

/** Fields every SRA2 item carries. */
export type ItemBaseSchema = DescriptionSchema & {
    bookmarked: BoolField;
};

/** One number field per attribute. */
export type AttributesSchema = Record<Attribute, NumField>;

/**
 * Damage track as filled-box counts. Box totals are derived (they depend on amps), so the stored
 * counts may exceed the current total; consumers clamp with the derived maximum.
 */
export type DamageTrackSchema = {
    light: NumField;
    serious: NumField;
    /** Every track has one incapacitated box, so this is 0 or 1. */
    incapacitating: NumField;
};

/** A Risk Reduction entry. `target` is a skill/specialization slug or an attribute key. */
export type RREntrySchema = {
    type: ChoiceField<RRType>;
    target: StrField;
    value: NumField;
    /** Free-text application condition, e.g. "if in shadow". */
    label: StrField;
};

/** A narrative effect. Negative values are drawbacks; the sign is the only polarity marker. */
export type NarrativeEffectSchema = {
    text: StrField;
    value: NumField;
};

/** Structured damage value (DV). */
export type DamageValueSchema = {
    mode: ChoiceField<DamageMode>;
    /** Fixed value (mode "fixed") or modifier added to the attribute (mode "attribute"). */
    value: NumField;
    /** Attribute the damage scales with (mode "attribute"); null when it scales with none. */
    attribute: NullableChoiceField<Attribute>;
};

/** Damage thresholds (derived): damage strictly above a threshold reaches that severity. */
export type ThresholdsSchema = {
    light: NumField;
    serious: NumField;
    incapacitating: NumField;
};

/** A damage track's box totals (derived). Every track has exactly one incapacitated box. */
export type DamageBoxesSchema = {
    light: NumField;
    serious: NumField;
    incapacitating: NumField;
};

/** Damage boxes bought on top of a track's base boxes. The incapacitated box can't be bought. */
export type ExtraDamageBoxesSchema = {
    light: NumField;
    serious: NumField;
};

export type RRListField = ArrayOf<Schema<RREntrySchema>>;
export type NarrativeEffectsField = ArrayOf<Schema<NarrativeEffectSchema>>;

/* -------------------------------------------- */
/*  Builders                                    */
/* -------------------------------------------- */

export function descriptionFields(): DescriptionSchema {
    return { description: html(), gmDescription: html(), reference: str() };
}

export function itemBaseFields(): ItemBaseSchema {
    return { ...descriptionFields(), bookmarked: bool() };
}

export function damageTrack(): Schema<DamageTrackSchema> {
    return schema({
        light: int(0, { min: 0 }),
        serious: int(0, { min: 0 }),
        incapacitating: int(0, { min: 0, max: BASE_DAMAGE_BOXES.incapacitating }),
    });
}

/** Extra damage boxes bought (+3 rating per light, +6 per serious). */
export function extraDamageBoxes(): Schema<ExtraDamageBoxesSchema> {
    return schema({ light: int(0, { min: 0 }), serious: int(0, { min: 0 }) });
}

export function damageValue(): Schema<DamageValueSchema> {
    return schema({
        mode: choice(DAMAGE_MODES, "fixed"),
        value: int(0),
        attribute: nullableChoice(ATTRIBUTES),
    });
}

export function rrList(): RRListField {
    return array(
        schema({
            type: choice(RR_TYPES, "skill"),
            target: str(),
            value: int(1, { min: 0, max: RR_MAX }),
            label: str(),
        }),
    );
}

export function narrativeEffects(): NarrativeEffectsField {
    return array(
        schema({
            text: str(),
            value: int(0, { min: -5, max: 5 }),
        }),
    );
}

export function derivedThresholds(): Schema<ThresholdsSchema> {
    return derivedSchema({
        light: derivedNum(),
        serious: derivedNum(),
        incapacitating: derivedNum(),
    });
}

export function derivedDamageBoxes(): Schema<DamageBoxesSchema> {
    return derivedSchema({
        light: derivedNum(),
        serious: derivedNum(),
        incapacitating: derivedNum(BASE_DAMAGE_BOXES.incapacitating),
    });
}
