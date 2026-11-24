import { CharacterModel } from "./actor/character.ts";
import { IceModel } from "./actor/ice.ts";
import { ServerModel } from "./actor/server.ts";
import { VehicleModel } from "./actor/vehicle.ts";
import { ampModels } from "./item/amp/index.ts";
import { KnowledgeModel } from "./item/knowledge.ts";
import { MetatypeModel } from "./item/metatype.ts";
import { SkillModel } from "./item/skill.ts";
import { SpecializationModel } from "./item/specialization.ts";

/**
 * Actor sub-type → data model. Registered on `CONFIG.Actor.dataModels` at load
 * (`scripts/hooks/load.ts`).
 */
export const actorModels = {
    character: CharacterModel,
    vehicle: VehicleModel,
    ice: IceModel,
    server: ServerModel,
} as const;

/**
 * Item sub-type → data model. Registered on `CONFIG.Item.dataModels` at load
 * (`scripts/hooks/load.ts`).
 */
export const itemModels = {
    skill: SkillModel,
    specialization: SpecializationModel,
    knowledge: KnowledgeModel,
    metatype: MetatypeModel,
    ...ampModels,
} as const;

export {
    CharacterModel,
    IceModel,
    KnowledgeModel,
    MetatypeModel,
    ServerModel,
    SkillModel,
    SpecializationModel,
    VehicleModel,
};
export * from "./item/amp/index.ts";
