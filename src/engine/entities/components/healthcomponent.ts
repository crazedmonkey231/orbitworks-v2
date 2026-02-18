import { EntityComponentState, UpdateArgs } from "../../types";
import { EntityComponentBase } from "../../entitycompbase";
import { Entity } from "../../entity";

/** A basic implementation of an entity component */
export class HealthComponent extends EntityComponentBase {
  private health: number = 100;
  private maxHealth: number = 100;
  private healthRegenRate: number = 0; // Health points per second
  constructor(entity: Entity, state: EntityComponentState) {
    super(entity, state);
    this.loadState(state);
  }

  damage(amount: number) {
    this.health = Math.max(this.health - amount, 0);
    if (this.health === 0) {
      this.getEntity()?.kill();
    }
  }

  onUpdate(args: UpdateArgs): void { 
    if (this.health < this.maxHealth && this.healthRegenRate > 0) {
      this.health = Math.min(this.health + this.healthRegenRate * args.deltaTime, this.maxHealth);
    }
  }
  
  onDispose(): void { }

  saveState(): EntityComponentState {
    const save = super.saveState();
    return {
      ...save,
      health: this.health,
      maxHealth: this.maxHealth,
      healthRegenRate: this.healthRegenRate,
    };
  }

  loadState(state: EntityComponentState): void {
    this.health = state.health || 100;
    this.maxHealth = state.maxHealth || 100;
    this.healthRegenRate = state.healthRegenRate || 0;
  }
}