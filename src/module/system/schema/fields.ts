/**
 * Named field types and the typed factories that build them.
 *
 * Schemas are written as explicit `type`s from the field types below, and `defineSchema()` is
 * checked against them. The factories exist because Foundry's field options wrap `initial` in
 * `NoInfer`: `new NumberField({ initial: 1 })` cannot infer that the field always has a value, so
 * its model type collapses to `number | null | undefined`. Each factory pins the generics to match
 * its named type.
 *
 * Everything here touches `foundry.data.fields` lazily (at call time), so call the factories only
 * from `defineSchema()`.
 */
import type { DocumentUUID } from "@client/utils/helpers.d.mts";
import type { DataSchema } from "@common/abstract/_types.d.mts";
import type {
    ArrayField,
    BooleanField,
    DataField,
    DocumentUUIDField,
    HTMLField,
    ModelPropsFromSchema,
    NumberField,
    SchemaField,
    SetField,
    SourceFromDataField,
    SourceFromSchema,
    StringField,
} from "@common/data/fields.d.mts";

import type { Attribute } from "../attributes.ts";

/* -------------------------------------------- */
/*  Field types                                 */
/* -------------------------------------------- */

/** Required, non-nullable number (integer or not). */
export type NumField = NumberField<number, number, true, false, true>;
/** Required boolean. */
export type BoolField = BooleanField<boolean, boolean, true, false, true>;
/** Required string; blank allowed. */
export type StrField = StringField<string, string, true, false, true>;
/** Required HTML string; blank allowed. */
export type HtmlField = HTMLField<string, string, true, false, true>;
/** Required string restricted to `T`. */
export type ChoiceField<T extends string> = StringField<T, T, true, false, true>;
/** String restricted to `T`, or null when unset. */
export type NullableChoiceField<T extends string> = StringField<T, T, true, true, true>;
/** Required array, initially empty. */
export type ArrayOf<TElement extends DataField> = ArrayField<TElement>;
/** Required set of distinct values; a model value is a `Set`, which keeps insertion order. */
export type SetOf<TElement extends DataField> = SetField<TElement>;
/** Required array of Document UUIDs. */
export type UuidArrayField = ArrayOf<DocumentUUIDField<DocumentUUID, true, false, false>>;
/** Nested schema. */
export type Schema<TSchema extends DataSchema> = SchemaField<TSchema>;
/** Required number that may be null. */
export type NullableNumField = NumberField<number, number, true, true, true>;
/** Nested schema, or null. */
export type NullableSchema<TSchema extends DataSchema> = SchemaField<
    TSchema,
    SourceFromSchema<TSchema>,
    ModelPropsFromSchema<TSchema>,
    true,
    true,
    true
>;

/* -------------------------------------------- */
/*  Factories                                   */
/* -------------------------------------------- */

const f = () => foundry.data.fields;

interface NumberRange {
    min?: number;
    max?: number;
}

/** Required, non-nullable integer. */
export function int(initial: number, range: NumberRange = {}): NumField {
    return new (f().NumberField)<number, number, true, false, true>({
        required: true,
        nullable: false,
        integer: true,
        initial,
        ...range,
    });
}

/** Required, non-nullable (possibly fractional) number. */
export function num(initial: number, range: NumberRange = {}): NumField {
    return new (f().NumberField)<number, number, true, false, true>({
        required: true,
        nullable: false,
        initial,
        ...range,
    });
}

export function bool(initial = false): BoolField {
    return new (f().BooleanField)<boolean, boolean, true, false, true>({
        required: true,
        nullable: false,
        initial,
    });
}

export function str(initial = ""): StrField {
    return new (f().StringField)<string, string, true, false, true>({
        required: true,
        nullable: false,
        blank: true,
        initial,
    });
}

export function html(): HtmlField {
    return new (f().HTMLField)<string, string, true, false, true>({
        required: true,
        nullable: false,
        blank: true,
        initial: "",
    });
}

export function choice<const T extends string>(
    choices: readonly T[],
    initial: NoInfer<T>,
): ChoiceField<T> {
    return new (f().StringField)<T, T, true, false, true>({
        required: true,
        nullable: false,
        blank: false,
        choices: [...choices],
        initial,
    });
}

export function nullableChoice<const T extends string>(
    choices: readonly T[],
): NullableChoiceField<T> {
    return new (f().StringField)<T, T, true, true, true>({
        required: true,
        nullable: true,
        blank: false,
        choices: [...choices],
        initial: null,
    });
}

export function array<const TElement extends DataField>(element: TElement): ArrayOf<TElement> {
    return new (f().ArrayField)<TElement>(element, {
        required: true,
        nullable: false,
        initial: [],
    });
}

/** Required set of distinct values, initially `initial` (in that order). */
export function set<const TElement extends DataField>(
    element: TElement,
    initial: SourceFromDataField<TElement>[] = [],
): SetOf<TElement> {
    return new (f().SetField)<TElement>(element, { required: true, nullable: false, initial });
}

/** Required array of non-blank Document UUIDs of the given type. */
export function uuidArray(type: "Actor" | "Item"): UuidArrayField {
    const element = new (f().DocumentUUIDField)<DocumentUUID, true, false, false>({
        required: true,
        nullable: false,
        type,
    });
    return array(element);
}

export function schema<const TSchema extends DataSchema>(fields: TSchema): Schema<TSchema> {
    return new (f().SchemaField)<TSchema>(fields);
}

/* -------------------------------------------- */
/*  Derived (non-persisted) fields              */
/* -------------------------------------------- */

/*
 * Derived data is declared in the schema like stored data, but with `persisted: false`: Foundry
 * initializes it to `initial` and never writes it to the database, and Active Effects can target
 * it. `prepareDerivedData()` fills it in. These take no min/max: derived values are computed, not
 * user input, and are never validated against source data.
 */

const DERIVED = { required: true, nullable: false, persisted: false } as const;

export function derivedNum(initial = 0): NumField {
    return new (f().NumberField)<number, number, true, false, true>({ ...DERIVED, initial });
}

export function derivedNullableNum(): NullableNumField {
    return new (f().NumberField)<number, number, true, true, true>({
        ...DERIVED,
        nullable: true,
        initial: null,
    });
}

export function derivedBool(initial = false): BoolField {
    return new (f().BooleanField)<boolean, boolean, true, false, true>({ ...DERIVED, initial });
}

export function derivedStr(initial = ""): StrField {
    return new (f().StringField)<string, string, true, false, true>({
        ...DERIVED,
        blank: true,
        initial,
    });
}

export function derivedChoice<const T extends string>(
    choices: readonly T[],
    initial: NoInfer<T>,
): ChoiceField<T> {
    return new (f().StringField)<T, T, true, false, true>({
        ...DERIVED,
        blank: false,
        choices: [...choices],
        initial,
    });
}

export function derivedNullableChoice<const T extends string>(
    choices: readonly T[],
): NullableChoiceField<T> {
    return new (f().StringField)<T, T, true, true, true>({
        ...DERIVED,
        nullable: true,
        blank: false,
        choices: [...choices],
        initial: null,
    });
}

export function derivedArray<const TElement extends DataField>(
    element: TElement,
): ArrayOf<TElement> {
    return new (f().ArrayField)<TElement>(element, { ...DERIVED, initial: [] });
}

export function derivedSchema<const TSchema extends DataSchema>(fields: TSchema): Schema<TSchema> {
    return new (f().SchemaField)<TSchema>(fields, { ...DERIVED });
}

/** Derived nested schema that is null when it doesn't apply. */
export function derivedNullableSchema<const TSchema extends DataSchema>(
    fields: TSchema,
): NullableSchema<TSchema> {
    return new (f().SchemaField)<
        TSchema,
        SourceFromSchema<TSchema>,
        ModelPropsFromSchema<TSchema>,
        true,
        true,
        true
    >(fields, { ...DERIVED, nullable: true, initial: null });
}

/** Derived integer per attribute. */
export function derivedAttributes(): Schema<Record<Attribute, NumField>> {
    return derivedSchema({
        strength: derivedNum(),
        agility: derivedNum(),
        willpower: derivedNum(),
        logic: derivedNum(),
        charisma: derivedNum(),
    });
}
