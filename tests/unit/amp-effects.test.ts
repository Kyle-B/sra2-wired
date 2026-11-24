import type { DataSchema } from "@common/abstract/_types.d.mts";
import type { ModelPropsFromSchema } from "@common/data/fields.d.mts";
import { VehicleModel } from "@models/actor/vehicle.ts";
import {
    type AmpModel,
    ampModels,
    CyberdeckModel,
    CyberwareModel,
    EquipmentModel,
} from "@models/item/amp/index.ts";
import type { AmpSystemMap } from "@models/item/amp/index.ts";
import {
    AMP_TYPES,
    applyModifiers,
    CHARACTER_STAT_BLOCK,
    characterStats,
    firewallEffect,
    localMax,
    initiativeEffect,
    statSheet,
} from "@system";
import type { AmpType, FeaturesSchema } from "@system";
import { describe, expect, it } from "vitest";

/**
 * Compile-time check: every model's type has the fields of the features it lists. (A schema type
 * that left one out would still get the fields at runtime, untyped.) A failing model shows up here
 * by name.
 */
type PropsOf<S> = S extends DataSchema ? ModelPropsFromSchema<S> : unknown;
type AmpsMissingFeatureFields = {
    [K in AmpType]: AmpSystemMap[K] extends PropsOf<
        FeaturesSchema<(typeof ampModels)[K]["features"]>
    >
        ? never
        : K;
}[AmpType];
type VehicleMissingFeatureFields =
    VehicleModel extends PropsOf<FeaturesSchema<typeof VehicleModel.features>> ? never : "vehicle";
const ampsHaveFeatureFields: [AmpsMissingFeatureFields] extends [never]
    ? true
    : AmpsMissingFeatureFields = true;
const vehicleHasFeatureFields: [VehicleMissingFeatureFields] extends [never]
    ? true
    : VehicleMissingFeatureFields = true;
void [ampsHaveFeatureFields, vehicleHasFeatureFields];

describe("amp effects", () => {
    it("effect keys are unique", () => {
        const keys = [
            ...new Set([
                ...Object.values(ampModels).flatMap((Model) => new Model().effects()),
                ...new VehicleModel().effects(),
            ]),
        ].map((e) => e.key);
        expect(keys.length).toBe(new Set(keys).size);
    });

    it("amps are traits (what a character is) or gear (what it has)", () => {
        const byKind = (kind: string) => AMP_TYPES.filter((t) => ampModels[t].kind === kind).sort();
        expect(byKind("trait")).toEqual(
            [
                "quality",
                "awakened",
                "emerged",
                "adeptPower",
                "spell",
                "complexForm",
                "contact",
                "bioware",
                "power",
            ].sort(),
        );
        expect(byKind("gear")).toEqual(
            ["equipment", "cyberware", "cyberdeck", "weapon", "armor"].sort(),
        );
        expect(new CyberwareModel().kind).toBe("gear");
    });

    it("every amp type has a model that knows its type", () => {
        expect(Object.keys(ampModels).sort()).toEqual([...AMP_TYPES].sort());
        for (const type of AMP_TYPES) expect(new ampModels[type]().ampType).toBe(type);
    });

    it("only qualities, cyberware, bioware, adept powers and decks can have boxes bought", () => {
        const withBoxes = AMP_TYPES.filter((type) => {
            const Model = ampModels[type] as unknown as new (data: object) => AmpModel;
            const { breakdown } = new Model({
                extraDamageBoxes: { light: 1, serious: 1 },
            }).computeRating();
            const priced = (key: string) => breakdown.filter((e) => e.key === key).length;
            expect([priced("lightBoxes"), priced("seriousBoxes")]).toEqual(
                priced("lightBoxes") ? [1, 1] : [0, 0],
            );
            return priced("lightBoxes") > 0;
        });
        expect(withBoxes.sort()).toEqual(
            ["quality", "cyberware", "bioware", "adeptPower", "cyberdeck"].sort(),
        );
    });

    it("maxima come from the effects", () => {
        expect(localMax(firewallEffect)).toBe(5);
        expect(localMax(initiativeEffect)).toBe(3);
    });

    it("an amp's rating is the sum of its breakdown", () => {
        const { rating, breakdown } = new EquipmentModel({
            firewall: 2,
            armorBonus: true,
            sustainedSpells: 1,
            riggerConsoles: 1,
        }).computeRating();
        expect(rating).toBe(breakdown.reduce((n, e) => n + e.value, 0));
        expect(rating).toBe(2 + 1 + 2 + 1);
    });

    it("stacking groups cap what a holder receives; ungrouped modifiers add up", () => {
        const sheet = statSheet(CHARACTER_STAT_BLOCK, null);
        const plusOne = { stat: "armorBonus", value: 1, target: "owner" } as const;
        const capped = { ...plusOne, stacking: { group: "armorBonus", max: 1 } };
        applyModifiers(sheet, [
            { name: "A", modifiers: [capped] },
            { name: "B", modifiers: [capped] },
            { name: "C", modifiers: [capped] },
        ]);
        expect(sheet.total("armorBonus")).toBe(1);
        expect(sheet.contributions("armorBonus")).toHaveLength(3);
        const uncapped = statSheet(CHARACTER_STAT_BLOCK, null);
        applyModifiers(uncapped, [{ name: "A", modifiers: [plusOne, plusOne] }]);
        expect(uncapped.total("armorBonus")).toBe(2);
    });

    it("several +1 armor bonuses on a character count once", () => {
        const plating = new CyberwareModel({ armorBonus: true });
        const { character } = characterStats(
            ["A", "B", "C"].map((name) => ({ name, system: plating })),
        );
        expect(character.total("armorBonus")).toBe(1);
    });

    it("modifiers go to their target: the carrier itself or its owner", () => {
        const { character, amps } = characterStats([
            // Equipment is only a matrix device when switched on.
            { name: "Flashlight", system: new EquipmentModel({ firewall: 3 }) },
            {
                name: "Commlink",
                system: new EquipmentModel({ firewall: 3, matrixCapable: true }),
            },
            // A deck's bought boxes extend its own track.
            { name: "Deck", system: new CyberdeckModel({ extraDamageBoxes: { light: 1 } }) },
            // Cyberware is always a matrix device, but its bought boxes go to the character.
            {
                name: "Bone lacing",
                system: new CyberwareModel({ firewall: 2, extraDamageBoxes: { light: 1 } }),
            },
        ]);
        const [flashlight, commlink, deck, lacing] = amps;
        expect(flashlight?.has("firewall")).toBe(false);
        expect(commlink?.total("firewall")).toBe(3);
        expect(commlink?.total("damageBoxes.light")).toBe(2);
        expect(deck?.total("damageBoxes.light")).toBe(3);
        expect(lacing?.total("firewall")).toBe(2);
        expect(lacing?.total("damageBoxes.light")).toBe(2);
        expect(character.contributions("damageBoxes.light")).toEqual([
            { source: "Bone lacing", value: 1 },
        ]);
        expect(character.total("damageBoxes.light")).toBe(3);
    });
});
