/** Character attributes, in display order. */
export const ATTRIBUTES = ["strength", "agility", "willpower", "logic", "charisma"] as const;
export type Attribute = (typeof ATTRIBUTES)[number];

export type AttributeRecord<T = number> = Record<Attribute, T>;

export function isAttribute(value: unknown): value is Attribute {
    return typeof value === "string" && (ATTRIBUTES as readonly string[]).includes(value);
}

/** Build a record with one entry per attribute. */
export function mapAttributes<T>(fn: (attribute: Attribute) => T): AttributeRecord<T> {
    return Object.fromEntries(ATTRIBUTES.map((a) => [a, fn(a)])) as AttributeRecord<T>;
}
