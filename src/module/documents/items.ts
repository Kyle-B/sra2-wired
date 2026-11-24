/**
 * One Item document subclass per sub-type, each narrowing `type`, `system` and `_source`, so that
 * e.g. `EquipmentItem.create({ type: "equipment", system: { … } })` type-checks the system data.
 *
 * Foundry constructs every Item from `CONFIG.Item.documentClass`; `SRA2ItemProxy` is registered
 * there and builds the subclass matching the data's `type`, so world, embedded and compendium items
 * all come out as the right class.
 */
import type { ItemSource } from "@common/documents/item.d.mts";
import { legacyItemType } from "@migration/legacy/index.ts";
import type { AmpModel } from "@models/item/amp/index.ts";
import type { AmpType } from "@system";

import type { SRA2Actor } from "./actor.ts";
import { type ItemSystemMap, type ItemType, SRA2Item } from "./item.ts";

/** Full source data of an item of sub-type `T`. */
export type ItemSourceOf<T extends ItemType> = ItemSource<T, ItemSystemMap[T]["_source"]>;

type Parent = SRA2Actor | null;

/** Base class narrowed to item sub-type `T`. */
function itemClass<const T extends ItemType>(type: T) {
    abstract class TypedItem<TParent extends Parent = Parent> extends SRA2Item<TParent> {
        /** The sub-type this class is for. */
        static readonly itemType: T = type;
        declare type: T;
        declare system: ItemSystemMap[T];
        declare readonly _source: ItemSourceOf<T>;
    }
    return TypedItem;
}

/** Common base of every amp item, whatever its amp type. */
export abstract class AmpItem<TParent extends Parent = Parent> extends SRA2Item<TParent> {
    declare type: AmpType;
    declare system: AmpModel;
}

/** Amp base class narrowed to amp sub-type `T`. */
function ampItemClass<const T extends AmpType>(type: T) {
    abstract class TypedAmpItem<TParent extends Parent = Parent> extends AmpItem<TParent> {
        /** The sub-type this class is for. */
        static readonly itemType: T = type;
        declare type: T;
        declare system: ItemSystemMap[T];
        declare readonly _source: ItemSourceOf<T>;
    }
    return TypedAmpItem;
}

/* -------------------------------------------- */
/*  Item sub-types                              */
/* -------------------------------------------- */

export class SkillItem<TParent extends Parent = Parent> extends itemClass("skill")<TParent> {}
export class SpecializationItem<TParent extends Parent = Parent> extends itemClass(
    "specialization",
)<TParent> {}
export class MetatypeItem<TParent extends Parent = Parent> extends itemClass("metatype")<TParent> {}
export class KnowledgeItem<TParent extends Parent = Parent> extends itemClass(
    "knowledge",
)<TParent> {}

/* -------------------------------------------- */
/*  Amp sub-types                               */
/* -------------------------------------------- */

export class QualityItem<TParent extends Parent = Parent> extends ampItemClass(
    "quality",
)<TParent> {}
export class ContactItem<TParent extends Parent = Parent> extends ampItemClass(
    "contact",
)<TParent> {}
export class AwakenedItem<TParent extends Parent = Parent> extends ampItemClass(
    "awakened",
)<TParent> {}
export class AdeptPowerItem<TParent extends Parent = Parent> extends ampItemClass(
    "adeptPower",
)<TParent> {}
export class EquipmentItem<TParent extends Parent = Parent> extends ampItemClass(
    "equipment",
)<TParent> {}
export class ArmorItem<TParent extends Parent = Parent> extends ampItemClass("armor")<TParent> {}
export class CyberwareItem<TParent extends Parent = Parent> extends ampItemClass(
    "cyberware",
)<TParent> {}
export class BiowareItem<TParent extends Parent = Parent> extends ampItemClass(
    "bioware",
)<TParent> {}
export class CyberdeckItem<TParent extends Parent = Parent> extends ampItemClass(
    "cyberdeck",
)<TParent> {}
export class WeaponItem<TParent extends Parent = Parent> extends ampItemClass("weapon")<TParent> {}
export class SpellItem<TParent extends Parent = Parent> extends ampItemClass("spell")<TParent> {}
export class EmergedItem<TParent extends Parent = Parent> extends ampItemClass(
    "emerged",
)<TParent> {}
export class ComplexFormItem<TParent extends Parent = Parent> extends ampItemClass(
    "complexForm",
)<TParent> {}
export class PowerItem<TParent extends Parent = Parent> extends ampItemClass("power")<TParent> {}

/** Item sub-type → document class. */
export const ITEM_CLASSES = {
    skill: SkillItem,
    specialization: SpecializationItem,
    knowledge: KnowledgeItem,
    metatype: MetatypeItem,
    quality: QualityItem,
    contact: ContactItem,
    awakened: AwakenedItem,
    adeptPower: AdeptPowerItem,
    equipment: EquipmentItem,
    armor: ArmorItem,
    cyberware: CyberwareItem,
    bioware: BiowareItem,
    cyberdeck: CyberdeckItem,
    weapon: WeaponItem,
    spell: SpellItem,
    emerged: EmergedItem,
    complexForm: ComplexFormItem,
    power: PowerItem,
} as const satisfies { [K in ItemType]: new (...args: never[]) => ItemClassMap[K] };

/** Item sub-type → document class instance, with parent `TParent`. */
export interface ItemClassMap<TParent extends Parent = Parent> {
    skill: SkillItem<TParent>;
    specialization: SpecializationItem<TParent>;
    knowledge: KnowledgeItem<TParent>;
    metatype: MetatypeItem<TParent>;
    quality: QualityItem<TParent>;
    contact: ContactItem<TParent>;
    awakened: AwakenedItem<TParent>;
    adeptPower: AdeptPowerItem<TParent>;
    equipment: EquipmentItem<TParent>;
    armor: ArmorItem<TParent>;
    cyberware: CyberwareItem<TParent>;
    bioware: BiowareItem<TParent>;
    cyberdeck: CyberdeckItem<TParent>;
    weapon: WeaponItem<TParent>;
    spell: SpellItem<TParent>;
    emerged: EmergedItem<TParent>;
    complexForm: ComplexFormItem<TParent>;
    power: PowerItem<TParent>;
}

/** The document class instance for item sub-type `T`. */
export type ItemOf<T extends ItemType, TParent extends Parent = Parent> = ItemClassMap<TParent>[T];

const isItemType = (type: string): type is ItemType => type in ITEM_CLASSES;

/**
 * Registered as `CONFIG.Item.documentClass`. Constructs the subclass for the data's `type`; statics
 * (create, migrateData, …) fall through to `SRA2Item`. The type is the one the legacy import will
 * give the data (e.g. an old `feat` becomes its amp type, an old Astral Combat skill a
 * specialization), since the class is picked before `migrateData` runs. Current data keeps its
 * type.
 */
export const SRA2ItemProxy = new Proxy(SRA2Item, {
    construct(target, args: ConstructorParameters<typeof SRA2Item>) {
        const source = (args[0] ?? {}) as Record<string, unknown>;
        const resolved = legacyItemType(source);
        const ItemClass = isItemType(resolved) ? ITEM_CLASSES[resolved] : target;
        return new (ItemClass as typeof SRA2Item)(...args);
    },
});
