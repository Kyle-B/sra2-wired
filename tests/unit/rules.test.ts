import { IceModel } from "@models/actor/ice.ts";
import { VehicleModel } from "@models/actor/vehicle.ts";
import {
    AdeptPowerModel,
    type AmpModel,
    ArmorModel,
    BiowareModel,
    CyberdeckModel,
    complexFormAttackSkills,
    CyberwareModel,
    EmergedModel,
    EquipmentModel,
    QualityModel,
    spellAttackSkills,
    WeaponModel,
} from "@models/item/amp/index.ts";
import { SkillModel } from "@models/item/skill.ts";
import {
    mapAttributes,
    attributeCost,
    characterStats,
    computeArmor,
    initiativeBenefits,
    computeCharacter,
    type CharacterRulesInput,
    type IceType,
    applyHit,
    resolveDamage,
    severityFor,
    steppedThresholds,
    effectiveHostRating,
    npcThreshold,
    rrSourcesFor,
    totalRR,
    normalizeName,
    skillCost,
    SKILLS,
    SPECIALIZATIONS,
    WEAPON_PRESETS,
} from "@system";
import { describe, expect, it } from "vitest";

describe("skills", () => {
    it.each([
        [0, 0],
        [3, 7_500],
        [5, 12_500],
        [6, 17_500],
        [8, 27_500],
    ])("rating %i costs %i", (rating, cost) => expect(skillCost(rating)).toBe(cost));

    it("normalizes names", () =>
        expect(normalizeName("  Spé : Électronique ")).toBe("spe : electronique"));

    it("a skill can be rolled with several attributes, kept in order", () => {
        expect([...new SkillModel().linkedAttributes]).toEqual(["strength"]);
        const survival = new SkillModel({ linkedAttributes: ["logic", "willpower", "charisma"] });
        expect([...survival.linkedAttributes]).toEqual(["logic", "willpower", "charisma"]);
    });

    it("each canonical specialization uses some of its skill's attributes", () => {
        const misfits = Object.entries(SPECIALIZATIONS).filter(([, spec]) =>
            spec.attributes.some(
                (a) => !(SKILLS[spec.skill].attributes as readonly string[]).includes(a),
            ),
        );
        expect(misfits).toEqual([]);
    });

    it("only lockpicking and conjuration's specializations have more than one attribute", () => {
        // Conjuration's: each character rolls conjuring with logic or charisma, its choice.
        const several = Object.entries(SPECIALIZATIONS).filter(([, s]) => s.attributes.length > 1);
        expect(several.filter(([, s]) => s.skill !== "conjuration").map(([slug]) => slug)).toEqual([
            "spec_lockpicking",
        ]);
        expect(several.filter(([, s]) => s.skill === "conjuration")).toHaveLength(8);
    });
});

describe("damage", () => {
    const t = steppedThresholds(4); // 4 / 7 / 10

    it("severity requires strictly exceeding a threshold", () => {
        expect([4, 5, 7, 8, 10, 11].map((d) => severityFor(d, t))).toEqual([
            "none",
            "light",
            "light",
            "serious",
            "serious",
            "incapacitating",
        ]);
    });

    it("overflow cascades light → serious → incapacitated", () => {
        const boxes = { light: 2, serious: 1, incapacitating: 1 };
        let track = { light: 0, serious: 0, incapacitating: 0 };
        const overflows: boolean[] = [];
        for (let i = 0; i < 4; i++) {
            const r = applyHit(track, "light", boxes);
            track = r.track;
            overflows.push(r.overflow);
        }
        expect(track).toEqual({ light: 2, serious: 1, incapacitating: 1 });
        expect(overflows).toEqual([false, false, true, true]);
    });

    it("resolves damage specs", () => {
        const attrs = mapAttributes(() => 3);
        expect(
            resolveDamage({ mode: "attribute", value: 2, attribute: "strength" }, attrs, 1).value,
        ).toBe(6);
        expect(resolveDamage({ mode: "fixed", value: 5, attribute: null }, attrs).value).toBe(5);
        expect(resolveDamage({ mode: "toxin", value: 0, attribute: null }, attrs).value).toBeNull();
    });

    it("an attribute DV without an attribute can't be resolved; a new DV has none", () => {
        const attrs = mapAttributes(() => 3);
        expect(
            resolveDamage({ mode: "attribute", value: 2, attribute: null }, attrs).value,
        ).toBeNull();
        expect(new WeaponModel().attack.dv).toEqual({ mode: "fixed", value: 0, attribute: null });
    });
});

describe("amps", () => {
    it("type-specific fields count only where the type has them", () => {
        // Firewall adds 1 rating per point on any firewall amp; attack rating exists only on decks.
        expect(new CyberdeckModel({ firewall: 2, attackRating: 3 }).computeRating().rating).toBe(5);
        expect(new EquipmentModel({ firewall: 2 }).computeRating().rating).toBe(2);
        expect(new CyberwareModel().computeRating().rating).toBe(1); // cyberware base rating only
        expect(new BiowareModel().computeRating().rating).toBe(2); // bioware is 1 rating dearer
    });

    it("a deck's extra boxes go on the deck itself, at +3 / +6 rating", () => {
        const deck = new CyberdeckModel({
            firewall: 0,
            extraDamageBoxes: { light: 1, serious: 1 },
        });
        deck.prepareDerivedData();
        expect(deck.damageBoxes).toEqual({ light: 3, serious: 2, incapacitating: 1 });
        expect(deck.computeRating().rating).toBe(3 + 6);
    });

    it("+1 armor adds 1 rating", () => {
        expect(
            new QualityModel({ isFirstQuality: true, armorBonus: true }).computeRating().rating,
        ).toBe(1);
    });

    it("an amp's cost prices its computed rating, which preparing it fills in", () => {
        // Cyberware base 1 + firewall 2 + armor bonus 1 = rating 4, at 5,000 per point.
        const implant = new CyberwareModel({ firewall: 2, armorBonus: true });
        expect(implant.computeCost()).toBe(4 * 5_000);
        implant.prepareDerivedData();
        expect(implant.rating).toBe(4);
        expect(implant.ratingBreakdown.map((e) => e.key)).toEqual([
            "firewall",
            "armorBonus",
            "cyberware",
        ]);
        expect(implant.cost).toBe(4 * 5_000);
    });

    it("armor amps cost 2,500 per point; shields count at most 1", () => {
        expect(new ArmorModel({ armor: 3 }).computeCost()).toBe(7_500);
        expect(new ArmorModel({ armor: 3, isShield: true }).computeCost()).toBe(2_500);
    });

    it("bows and crossbows use the archery specialization", () => {
        expect(WEAPON_PRESETS.bows.specialization).toBe("spec_archery");
        expect(WEAPON_PRESETS.crossbows.specialization).toBe("spec_archery");
        // Presets whose specialization varies from weapon to weapon have none.
        expect(WEAPON_PRESETS.shortWeapons.specialization).toBe("");
        expect(WEAPON_PRESETS.tasers.specialization).toBe("");
        expect(WEAPON_PRESETS.tasers.dv).toEqual({ mode: "fixed", value: 5, attribute: null });
    });

    it("spells and complex forms roll with fixed skills", () => {
        expect(spellAttackSkills("health")).toEqual({
            skill: "sorcery",
            specialization: "spec_healthSpells",
        });
        expect(complexFormAttackSkills("compilation")).toEqual({
            skill: "technomancer",
            specialization: "spec_compilation",
        });
    });
});

describe("initiative enhancement", () => {
    it("tiers cost 2 / 3 / 2 rating cumulatively, 1 less per tier when limited to a realm", () => {
        const rating = (tier: number, realm: "all" | "physical" = "all") =>
            new AdeptPowerModel({
                initiativeEnhancement: tier,
                initiativeRealm: realm,
            }).computeRating().rating - 1; // minus the adept power's own base rating
        expect([1, 2, 3].map((t) => rating(t))).toEqual([2, 5, 7]);
        expect([1, 2, 3].map((t) => rating(t, "physical"))).toEqual([1, 3, 4]);
    });

    it("tiers are cumulative", () => {
        expect([0, 1, 2, 3].map((t) => initiativeBenefits(t))).toEqual([
            { edgePerActionScene: 0, canSpendEdgeForActions: false, extraActionsPerNarration: 0 },
            { edgePerActionScene: 1, canSpendEdgeForActions: true, extraActionsPerNarration: 0 },
            { edgePerActionScene: 1, canSpendEdgeForActions: true, extraActionsPerNarration: 1 },
            { edgePerActionScene: 2, canSpendEdgeForActions: true, extraActionsPerNarration: 1 },
        ]);
    });

    it("sources don't stack: the best applies in each realm", () => {
        const d = computeCharacter({
            attributes: mapAttributes(() => 3),
            maxEssence: 6,
            metatype: null,
            amps: [
                {
                    name: "Wired",
                    system: new CyberwareModel({ initiativeEnhancement: 1 }),
                    cost: 0,
                },
                {
                    name: "Astral boost",
                    system: new AdeptPowerModel({
                        initiativeEnhancement: 3,
                        initiativeRealm: "astral",
                    }),
                    cost: 0,
                },
                { name: "Quick", system: new QualityModel({ initiativeEnhancement: 1 }), cost: 0 },
            ],
            otherItemCosts: [],
            vehicleCosts: [],
        });
        expect(d.initiative.physical).toMatchObject({
            tier: 1,
            source: "Wired",
            edgePerActionScene: 1,
        });
        expect(d.initiative.virtual.tier).toBe(1);
        expect(d.initiative.astral).toMatchObject({
            tier: 3,
            source: "Astral boost",
            edgePerActionScene: 2,
        });
    });
});

describe("armor", () => {
    const armorOf = (amps: Parameters<typeof characterStats>[0]) =>
        computeArmor(characterStats(amps).character);
    const worn = (
        name: string,
        armor: number,
        patch: ConstructorParameters<typeof ArmorModel>[0] = {},
    ) => ({
        name,
        system: new ArmorModel({ armor, ...patch }),
    });
    const plusOne = (name: string) => ({ name, system: new CyberwareModel({ armorBonus: true }) });

    it("armor amps don't stack; the best one applies", () => {
        expect(armorOf([worn("Vest", 2), worn("Jacket", 4)])).toEqual({
            level: 4,
            bonus: 0,
            shield: 0,
            perAmp: [
                { name: "Vest", level: 2 },
                { name: "Jacket", level: 4 },
            ],
        });
    });

    it("a shield and one +1 bonus stack on each worn armor; +1 bonuses don't stack together", () => {
        const a = armorOf([
            worn("Jacket", 4),
            worn("Riot shield", 3, { isShield: true }),
            plusOne("Dermal plating"),
            plusOne("Bone lacing"),
        ]);
        expect(a).toEqual({
            level: 6,
            bonus: 1,
            shield: 1,
            perAmp: [{ name: "Jacket", level: 6 }],
        });
    });

    it("shield and bonus count without worn armor; no overall cap", () => {
        expect(armorOf([worn("Buckler", 1, { isShield: true }), plusOne("Plating")]).level).toBe(2);
        expect(armorOf([worn("Heavy", 5), plusOne("Plating")]).level).toBe(6);
        expect(armorOf([]).level).toBe(0);
    });
});

describe("character", () => {
    const base = (patch: Partial<CharacterRulesInput> = {}): CharacterRulesInput => ({
        attributes: { strength: 3, agility: 4, willpower: 2, logic: 2, charisma: 1 },
        maxEssence: 6,
        metatype: null,
        amps: [],
        otherItemCosts: [],
        vehicleCosts: [],
        ...patch,
    });

    it("attribute cost: the metatype-maximum level costs double", () => {
        expect(attributeCost(3, 99)).toBe(30_000);
        expect(attributeCost(3, 3)).toBe(40_000);
    });

    it("baseline with no metatype or amps", () => {
        const d = computeCharacter(base());
        expect(d.startingEdge).toBe(3);
        expect(d.initiative.physical).toEqual({
            tier: 0,
            source: "",
            edgePerActionScene: 0,
            canSpendEdgeForActions: false,
            extraActionsPerNarration: 0,
        });
        expect(d.damageBoxes).toEqual({ light: 2, serious: 1, incapacitating: 1 });
        expect(d.thresholds.physical).toEqual({ light: 3, serious: 6, incapacitating: 9 });
        expect(d.thresholds.matrix).toEqual({ light: 0, serious: 0, incapacitating: 0 });
        expect(d.totalCost).toBe(120_000);
    });

    it("clamps to metatype maxima and takes its starting edge", () => {
        const d = computeCharacter(
            base({ metatype: { maxAttributes: mapAttributes(() => 3), edge: 4 } }),
        );
        expect(d.effectiveAttributes.agility).toBe(3);
        expect(d.attributeCosts.strength).toBe(40_000);
        expect(d.startingEdge).toBe(4);
    });

    it("aggregates active amps only", () => {
        const a = (name: string, system: AmpModel, cost = 0) => ({
            name,
            system,
            cost,
        });
        const d = computeCharacter(
            base({
                amps: [
                    a("Jacket", new ArmorModel({ armor: 4 }), 10_000),
                    a(
                        "Wired",
                        new CyberwareModel({
                            essenceCost: 1.5,
                            armorBonus: true,
                            initiativeEnhancement: 2,
                            firewall: 5, // no matrix effect off a deck
                            extraDamageBoxes: { light: 1 },
                        }),
                    ),
                    a("Deck", new CyberdeckModel({ firewall: 3 })),
                    a(
                        "Off",
                        new CyberwareModel({
                            active: false,
                            essenceCost: 2,
                            initiativeEnhancement: 3,
                        }),
                        99_999,
                    ),
                ],
            }),
        );
        expect(d.armor.level).toBe(5);
        // Strength 3 + armor 5; willpower 2. Thresholds come only from attributes and armor.
        expect(d.thresholds.physicalArmored).toEqual({ light: 8, serious: 11, incapacitating: 14 });
        expect(d.thresholds.mental.light).toBe(2);
        expect(d.thresholds.matrix).toEqual({ light: 3, serious: 6, incapacitating: 9 });
        expect(d.damageBoxes.light).toBe(3);
        // The inactive tier-3 enhancement is ignored; Wired's tier 2 applies in every realm.
        expect(d.initiative.astral).toEqual({
            tier: 2,
            source: "Wired",
            edgePerActionScene: 1,
            canSpendEdgeForActions: true,
            extraActionsPerNarration: 1,
        });
        expect(d.essence).toBe(4.5);
        expect(d.totalCost).toBe(120_000 + 10_000);
    });

    it("a deck's box bonuses don't add to the character's boxes", () => {
        const deck = new CyberdeckModel({ extraDamageBoxes: { light: 2, serious: 1 } });
        const vest = new CyberwareModel({ extraDamageBoxes: { light: 1, serious: 0 } });
        const d = computeCharacter(
            base({
                amps: [
                    { name: "Deck", system: deck, cost: 0 },
                    { name: "Vest", system: vest, cost: 0 },
                ],
            }),
        );
        expect(d.damageBoxes).toEqual({ light: 3, serious: 1, incapacitating: 1 });
    });

    it("emerged without a deck uses the virtual persona firewall", () => {
        const d = computeCharacter(
            base({ amps: [{ name: "TM", system: new EmergedModel(), cost: 0 }] }),
        );
        expect(d.virtualPersona).toEqual({ firewall: 2, attack: 1 });
        expect(d.thresholds.matrix.light).toBe(2);
    });
});

describe("vehicle", () => {
    it("preset stats, thresholds and base cost", () => {
        const drone = new VehicleModel({ vehicleType: "mediumDrone" });
        drone.prepareDerivedData();
        // The preset can fly, but flying speed only counts once the vehicle is flagged as flying.
        expect(drone.baseProfile).toEqual({ ...drone.stats, flyingSpeed: 6 });
        expect(drone.stats).toEqual({
            autopilot: 6,
            structure: 2,
            handling: 7,
            speed: 3,
            flyingSpeed: 0,
            armor: 0,
            weaponMount: "rifle",
        });
        expect(drone.thresholds).toEqual({ light: 2, serious: 4, incapacitating: 6 });
        expect(drone.damageBoxes).toEqual({ light: 2, serious: 1, incapacitating: 1 });
        expect(drone.rating).toBe(0);
        expect(drone.cost).toBe(5_000);
    });

    it("upgrades change stats and cost", () => {
        const vehicle = new VehicleModel({
            vehicleType: "mediumDrone",
            upgrades: { autopilot: 6, armor: 5, flying: true, fixed: true },
            narrativeEffects: [{ value: 2 }, { value: -1 }],
            weaponMounts: [{ cost: 1 }],
        });
        vehicle.prepareDerivedData();
        expect(vehicle.stats.autopilot).toBe(12);
        expect(vehicle.stats.armor).toBe(2); // capped at structure
        expect(vehicle.stats.speed).toBe(0);
        expect(vehicle.stats.flyingSpeed).toBe(6);
        expect(vehicle.stats.weaponMount).toBe("rifle");
        // 6 + 5 + 1 flying - 1 fixed + 1 effects + 1 mount cost
        expect(vehicle.rating).toBe(13);
        expect(vehicle.rating).toBe(vehicle.ratingBreakdown.reduce((n, e) => n + e.value, 0));
        expect(vehicle.cost).toBe(5_000 + 13 * 5_000);
        // Mounted weapons add their own cost.
        expect(vehicle.computeCost([2_500])).toBe(vehicle.cost + 2_500);
    });

    it("the first mount is free when the vehicle comes with one; mount costs add up", () => {
        const weaponMounts = [{ cost: 0 }, { cost: 2 }, { cost: 1 }];
        // medium drone comes with a rifle mount: 2 extra mounts + 3 rating of mount costs
        const drone = new VehicleModel({ vehicleType: "mediumDrone", weaponMounts });
        expect(drone.computeCost()).toBe(5_000 + 5 * 5_000);
        // no standard mount: all 3 mounts are extra
        const sedan = new VehicleModel({ vehicleType: "sedan", weaponMounts });
        expect(sedan.computeCost()).toBe(5_000 + 6 * 5_000);
    });

    it("extra damage boxes add to the vehicle's own track at +3 / +6 rating, as on an amp", () => {
        const drone = new VehicleModel({
            vehicleType: "mediumDrone",
            extraDamageBoxes: { light: 2, serious: 1 },
        });
        drone.prepareDerivedData();
        expect(drone.damageBoxes).toEqual({ light: 4, serious: 2, incapacitating: 1 });
        expect(drone.ratingBreakdown).toEqual([
            { key: "lightBoxes", value: 6, count: 2 },
            { key: "seriousBoxes", value: 6, count: 1 },
        ]);
        expect(drone.cost).toBe(5_000 + (2 * 3 + 6) * 5_000);
    });

    it("RR on a vehicle is priced like an amp's", () => {
        const drone = new VehicleModel({
            vehicleType: "mediumDrone",
            rr: [{ type: "skill", target: "piloting", value: 1 }],
        });
        drone.prepareDerivedData();
        expect(drone.ratingBreakdown).toEqual([{ key: "rrSkill", value: 5, count: 1 }]);
        expect(drone.cost).toBe(5_000 + 5 * 5_000);
    });

    it("no type chosen means zero stats", () => {
        const vehicle = new VehicleModel();
        vehicle.prepareDerivedData();
        expect(vehicle.stats.autopilot).toBe(0);
    });
});

describe("matrix", () => {
    it("ice damage by type, from the host rating", () => {
        const ice = (iceType: IceType | null, hostRating: number) => {
            const model = new IceModel({ iceType, hostRating });
            model.prepareDerivedData();
            return model;
        };
        expect(ice("blaster", 5)).toMatchObject({ dv: 3, damageType: "matrix" });
        expect(ice("black", 5)).toMatchObject({ dv: 3, damageType: "biofeedback" });
        expect(ice("killer", 5)).toMatchObject({ dv: 5, damageType: "matrix" });
        expect(ice("patrol", 5)).toMatchObject({ dv: null, damageType: null });
        expect(ice(null, 4)).toMatchObject({
            firewall: 1,
            threshold: 4,
            thresholds: { light: 1, serious: 2, incapacitating: 3 },
        });
    });

    it("physical security adds one to the host rating", () => {
        expect(effectiveHostRating(4, true)).toBe(5);
        expect(effectiveHostRating(4, false)).toBe(4);
    });
});

describe("risk reduction", () => {
    const carriers = [
        {
            name: "Smartlink",
            rr: [
                { type: "specialization" as const, target: "spec_pistols", value: 1, label: "" },
                { type: "skill" as const, target: "", value: 1, label: "untargeted" },
            ],
        },
        {
            name: "Reflexes",
            rr: [{ type: "attribute" as const, target: "agility", value: 2, label: "" }],
        },
        {
            name: "Drone",
            rr: [{ type: "skill" as const, target: "rangedWeapons", value: 1, label: "" }],
        },
    ];

    it("matches by exact slug per type", () => {
        const sources = rrSourcesFor(
            { attribute: "agility", skill: "rangedWeapons", specialization: "spec_pistols" },
            carriers,
        );
        expect(sources.map((s) => s.source)).toEqual(["Smartlink", "Reflexes", "Drone"]);
        expect(totalRR(sources)).toBe(4);
        expect(rrSourcesFor({ skill: "athletics" }, carriers)).toEqual([]);
    });

    it("npc threshold", () => expect(npcThreshold(7, 1)).toBe(4));
});
