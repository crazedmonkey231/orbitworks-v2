import { EntityComponentState } from './types';
import { BasicEntityComponent } from "./entities/components/basiccomponent";
import { SpotLightComponent } from './entities/components/spotlightcomponent';
import { ImpulseComponent } from "./entities/components/impulsecomponent";
import { PointLightComponent } from './entities/components/pointlightcomponent';
import { AudioComponent } from './entities/components/audiocomponent';
import { CharacterControllerComponent } from './entities/components/charactercontroller';
import { SpriteComponent } from './entities/components/spritecomponent';
import { CameraFollowComponent } from './entities/components/camerafollowcomponent';
import { LauncherComponent } from './entities/components/lauchercomponent';
import { CollisionComponent } from './entities/components/collisioncomponent';
import { AiControllerComponent } from './entities/components/aicontroller';
import { SpawnerComponent } from './entities/components/spawnercomponent';
import { HealthComponent } from './entities/components/healthcomponent';
import { ParticleBurstComponent } from './entities/components/particleburstcomponent';
import { ConvergenceBurstComponent } from './entities/components/convergenceburst';
import { AnimatedSpriteComponent } from './entities/components/animatedspritecomponent';
import { Entity } from './entity';
import { EntityComponent } from './entitycomp';

/** EntityComponentTypeMap defines a mapping from component type strings to their corresponding component classes */
interface EntityComponentTypeMap {
  [key: string]: new (entity: Entity, state: EntityComponentState) => EntityComponent;
}

/** 
 * A mapping of component types to their corresponding classes. 
 * Add more as needed. 
 */
const entityComponentTypeMap: EntityComponentTypeMap = {
  BasicComp: BasicEntityComponent,
  ImpulseComp: ImpulseComponent,
  PointLightComp: PointLightComponent,
  SpotLightComp: SpotLightComponent, 
  AudioComp: AudioComponent,
  CharacterController: CharacterControllerComponent,
  AiController: AiControllerComponent,
  SpriteComp: SpriteComponent,
  AnimatedSpriteComp: AnimatedSpriteComponent,
  CameraFollow: CameraFollowComponent,
  LauncherComp: LauncherComponent,
  CollisionComp: CollisionComponent,
  SpawnerComp: SpawnerComponent,
  HealthComp: HealthComponent,
  ParticleBurst: ParticleBurstComponent,
  ConvergenceBurst: ConvergenceBurstComponent
};


export function createComponent<T extends EntityComponent>(entity: Entity, state: EntityComponentState): T | undefined {
  const ComponentClass = entityComponentTypeMap[state.compType];
  if (!ComponentClass) {
    // console.log(`Component type ${state.compType} not found.`);
    return undefined;
  }
  // console.log(`Creating component of type ${state.compType}.`);
  return new ComponentClass(entity, state) as T;
}

export function createComponentsFromStates(entity: Entity, states: EntityComponentState[]): EntityComponent[] {
  return states.map(state => createComponent(entity, state)).filter((comp) => comp !== undefined) as EntityComponent[];
}