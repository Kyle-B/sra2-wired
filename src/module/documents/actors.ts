/**
 * One Actor document subclass per sub-type, each narrowing `type`, `system` and `_source`, so that
 * e.g. `CharacterActor.create({ type: "character", system: { … } })` type-checks the system data.
 *
 * Foundry constructs every Actor from `CONFIG.Actor.documentClass`; `SRA2ActorProxy` is registered
 * there and builds the subclass matching the data's `type`, so world, token and compendium actors
 * all come out as the right class.
 */
import type { ActorSource } from "@common/documents/actor.d.mts";

import { type ActorSystemMap, type ActorType, SRA2Actor } from "./actor.ts";

/** Full source data of an actor of sub-type `T`. */
export type ActorSourceOf<T extends ActorType> = ActorSource<T, ActorSystemMap[T]["_source"]>;

type Parent = TokenDocument | null;

/** Base class narrowed to actor sub-type `T`. */
function actorClass<const T extends ActorType>(type: T) {
    abstract class TypedActor<TParent extends Parent = Parent> extends SRA2Actor<TParent> {
        /** The sub-type this class is for. */
        static readonly actorType: T = type;
        declare type: T;
        declare system: ActorSystemMap[T];
        declare readonly _source: ActorSourceOf<T>;
    }
    return TypedActor;
}

export class CharacterActor<TParent extends Parent = Parent> extends actorClass(
    "character",
)<TParent> {}
export class VehicleActor<TParent extends Parent = Parent> extends actorClass("vehicle")<TParent> {}
export class IceActor<TParent extends Parent = Parent> extends actorClass("ice")<TParent> {}
export class ServerActor<TParent extends Parent = Parent> extends actorClass("server")<TParent> {}

/** Actor sub-type → document class. */
export const ACTOR_CLASSES = {
    character: CharacterActor,
    vehicle: VehicleActor,
    ice: IceActor,
    server: ServerActor,
} as const satisfies Record<ActorType, unknown>;

/** The document class instance for actor sub-type `T`. */
export type ActorOf<T extends ActorType> = InstanceType<(typeof ACTOR_CLASSES)[T]>;

const isActorType = (type: unknown): type is ActorType =>
    typeof type === "string" && type in ACTOR_CLASSES;

/**
 * Registered as `CONFIG.Actor.documentClass`. Constructs the subclass for the data's `type`;
 * statics (create, migrateData, …) fall through to `SRA2Actor`. The old system used the same actor
 * type keys, so no legacy type resolution is needed here.
 */
export const SRA2ActorProxy = new Proxy(SRA2Actor, {
    construct(target, args: ConstructorParameters<typeof SRA2Actor>) {
        const type = (args[0] as Record<string, unknown> | undefined)?.["type"];
        const ActorClass = isActorType(type) ? ACTOR_CLASSES[type] : target;
        return new (ActorClass as typeof SRA2Actor)(...args);
    },
});
