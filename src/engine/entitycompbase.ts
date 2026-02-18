import { EntityComponentState, UpdateArgs } from "./types";
import { ThreeSceneBase } from "./threescenebase";
import { EntityComponent } from "./entitycomp";
import { Entity } from "./entity";

/** 
 * Base class for entity components, sets up the basic loading state and attachment of the component 
 */
export abstract class EntityComponentBase implements EntityComponent {
  private name: string = "UnnamedComponent";
  private compType: string = "Base";
  private entity: Entity | undefined;

  constructor(entity: Entity, state: EntityComponentState) {
    this.setName(state.name);
    this.setCompType(state.compType);
    this.setEntity(entity);
  }

  // Setters for core properties

  setName(name: string): void {
    this.name = name;
  }

  setCompType(compType: string): void {
    this.compType = compType;
  }

  setEntity(entity: Entity): void {
    this.entity = entity;
  }

  // Getters

  getName(): string {
    return this.name;
  }

  getEntity(): Entity | undefined {
    return this.entity;
  }

  getThreeScene(): ThreeSceneBase {
    const entity = this.getEntity();
    if (!entity) {
      throw new Error("EntityComponentBase: No entity attached to component.");
    }
    return entity.getThreeScene();
  }

  // Helpers

  isNameEqual(name: string): boolean {
    return this.name === name;
  }

  // Lifecycle methods

  collide?(otherEntity: Entity, started: boolean): void;

  /** onUpdate for custom update logic */
  abstract onUpdate(args: UpdateArgs): void;

  update(args: UpdateArgs): void { 
    this.onUpdate(args);
  }

  /** onDispose for custom cleanup */
  abstract onDispose(): void;

  dispose(): void {
    this.onDispose();
    this.entity = undefined;
  }

  removeFromEntity(): void {
    if (this.entity) {
      this.entity.removeComponent(this.name);
    }
  }

  // State management for saving/loading

  saveState(): EntityComponentState {
    return {
      name: this.name,
      compType: this.compType,
      // Add more state properties as needed
    };
  }
  
  abstract loadState(state: EntityComponentState): void;
}