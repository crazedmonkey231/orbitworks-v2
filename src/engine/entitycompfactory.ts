import { Entity, EntityComponent, EntityComponentState } from './core';
import { BasicEntityComponent } from "./entities/components/basiccomponent";
import { SpotLightComponent } from './entities/components/spotlightcomponent';
import { ImpulseComponent } from "./entities/components/impulsecomponent";
import { PointLightComponent } from './entities/components/pointlightcomponent';
import { AudioComponent } from './entities/components/audiocomponent';

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
};


export function createComponent<T extends EntityComponent>(entity: Entity, state: EntityComponentState): T {
  const ComponentClass = entityComponentTypeMap[state.compType];
  if (!ComponentClass) {
    const errorMsg = `Unknown component type: ${state.compType}.`;
    throw new Error(errorMsg);
  }
  return new ComponentClass(entity, state) as T;
}

export function createComponentsFromStates(entity: Entity, states: EntityComponentState[]): EntityComponent[] {
  return states.map(state => createComponent(entity, state));
}