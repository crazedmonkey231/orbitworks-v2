import { Entity, EntityComponentState, UpdateArgs } from "../../core";
import { EntityComponentBase } from "../../entitycompbase";

/** 
 * A basic implementation of a 3D audio component
 */
export class AudioComponent extends EntityComponentBase {
  private audioKey: string = "";
  constructor(entity: Entity, state: EntityComponentState) {
    super(entity, state);
    this.audioKey = state.audioKey || this.audioKey;
  }

  playAudio(): void {
    const entity = this.getEntity();
    if (!entity) return;
    const object3D = entity.getObject3D();
    this.getThreeScene().playSound3D(this.audioKey, object3D);
  }

  playAudioOnce(): void {
    this.playAudio();
    this.removeFromEntity();
  }

  onUpdate(args: UpdateArgs): void { }
  onDispose(): void { }

  saveState(): EntityComponentState {
    const state = super.saveState();
    state.audioKey = this.audioKey;
    return state;
  }

  loadState(state: EntityComponentState): void {
    super.loadState(state);
    this.audioKey = state.audioKey || this.audioKey;
  }
}