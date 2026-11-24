/**
 * Minimal stand-in for the parts of Foundry the data models use, so tests can construct real models
 * (`new CyberdeckModel({ firewall: 2 })`) without Foundry's source.
 *
 * It does what model construction needs and nothing more: every schema field is filled from the
 * given data, or from the field's `initial` when the data leaves it out (recursing into nested
 * schemas and array elements). It does not validate (choices, min/max, integer), clean, migrate or
 * prepare: call `prepareDerivedData()` yourself when a test needs derived values.
 *
 * Runs as a Vitest setup file, before any model module is imported: models extend
 * `foundry.abstract.TypeDataModel` when their module loads.
 */

type Options = { initial?: unknown; nullable?: boolean };

class DataField {
    constructor(readonly options: Options = {}) {}

    initialValue(): unknown {
        const { initial } = this.options;
        return typeof initial === "function"
            ? (initial as () => unknown)()
            : structuredClone(initial);
    }

    initialize(value: unknown): unknown {
        return value === undefined ? this.initialValue() : structuredClone(value);
    }
}

class SchemaField extends DataField {
    constructor(
        readonly fields: Record<string, DataField>,
        options: Options = {},
    ) {
        super(options);
    }

    override initialValue(): unknown {
        return "initial" in this.options ? super.initialValue() : this.initialize({});
    }

    override initialize(value: unknown): unknown {
        if (value === undefined) return this.initialValue();
        if (value === null) return null;
        const data = value as Record<string, unknown>;
        return Object.fromEntries(
            Object.entries(this.fields).map(([key, field]) => [key, field.initialize(data[key])]),
        );
    }
}

class ArrayField extends DataField {
    constructor(
        readonly element: DataField,
        options: Options = {},
    ) {
        super(options);
    }

    override initialize(value: unknown): unknown {
        if (!Array.isArray(value)) return this.initialValue();
        return value.map((v) => this.element.initialize(v));
    }
}

/** Like Foundry's: stored as an array, a `Set` on the model (insertion order kept). */
class SetField extends ArrayField {
    override initialize(value: unknown): unknown {
        return new Set(super.initialize(value) as unknown[]);
    }
}

class DataModel {
    readonly parent: unknown;

    static defineSchema(): Record<string, DataField> {
        return {};
    }

    constructor(data: Record<string, unknown> = {}, { parent = null }: { parent?: unknown } = {}) {
        this.parent = parent;
        const schema = (this.constructor as typeof DataModel).defineSchema();
        for (const [key, field] of Object.entries(schema)) {
            (this as Record<string, unknown>)[key] = field.initialize(data[key]);
        }
    }

    static migrateData(source: Record<string, unknown>): Record<string, unknown> {
        return source;
    }
}

class TypeDataModel extends DataModel {
    prepareBaseData(): void {}
    prepareDerivedData(): void {}
}

const foundryStub = {
    abstract: { DataModel, TypeDataModel },
    data: {
        fields: {
            DataField,
            SchemaField,
            ArrayField,
            SetField,
            NumberField: class NumberField extends DataField {},
            BooleanField: class BooleanField extends DataField {},
            StringField: class StringField extends DataField {},
            HTMLField: class HTMLField extends DataField {},
            DocumentUUIDField: class DocumentUUIDField extends DataField {},
        },
    },
};

(globalThis as Record<string, unknown>)["foundry"] = foundryStub;
