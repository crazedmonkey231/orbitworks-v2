import * as THREE from "three";
import { Howl, Howler } from "howler";
import { UpdateArgs } from "./shared";
import { AudioPath } from "./paths";

const POSITION_EPS = 1e-4
const ORIENTATION_EPS = 1e-4

class Listener {
  initialized: boolean = false
  position: THREE.Vector3 = new THREE.Vector3()
  forward: THREE.Vector3 = new THREE.Vector3(0, 0, -1)
  up: THREE.Vector3 = new THREE.Vector3(0, 1, 0)
  tmpForward: THREE.Vector3 = new THREE.Vector3()
  tmpUp: THREE.Vector3 = new THREE.Vector3()
  tmpObjectPosition: THREE.Vector3 = new THREE.Vector3()
  lastPos = new THREE.Vector3(NaN, NaN, NaN)
  lastForward = new THREE.Vector3(NaN, NaN, NaN)
  lastUp = new THREE.Vector3(NaN, NaN, NaN)
  camera!: THREE.Camera;
  constructor(camera: THREE.Camera) {
    this.camera = camera;
  }

  update() {
    if (!this.camera) return
    if (!(Howler as any).usingWebAudio || !Howler.ctx) return

    this.camera.getWorldPosition(this.position)
    this.tmpForward.copy(this.forward).applyQuaternion(this.camera.quaternion).normalize()
    this.tmpUp.copy(this.up).applyQuaternion(this.camera.quaternion).normalize()

    const posChanged = !this.initialized || this.position.distanceToSquared(this.lastPos) > POSITION_EPS
    if (posChanged) {
      Howler.pos(this.position.x, this.position.y, this.position.z)
      this.lastPos.copy(this.position)
    }

    const forwardChanged = !this.initialized || this.tmpForward.distanceToSquared(this.lastForward) > ORIENTATION_EPS
    const upChanged = !this.initialized || this.tmpUp.distanceToSquared(this.lastUp) > ORIENTATION_EPS
    if (forwardChanged || upChanged) {
      Howler.orientation(
        this.tmpForward.x, this.tmpForward.y, this.tmpForward.z,
        this.tmpUp.x, this.tmpUp.y, this.tmpUp.z
      )
      this.lastForward.copy(this.tmpForward)
      this.lastUp.copy(this.tmpUp)
    }

    this.initialized = true
  }  

  dispose() {
    // No resources to dispose for the listener itself, but we can reset the Howler listener state if needed
    Howler.pos(0, 0, 0);
    Howler.orientation(0, 0, -1, 0, 1, 0);
    this.initialized = false;
    this.camera = null as any;
  }
}

/** 
 * AudioManager class to handle loading and playing sounds and music using Howler.js
 * Supports loading, playing, stopping, and unloading of sounds, as well as managing background music.
 * Also handles 3D spatial audio by updating the listener's position and orientation based on the camera's transform.
*/
export class AudioManager {
  name: string = "AudioManager"
  private sounds: Map<string, Howl> = new Map();
  private currentMusic: Howl | null = null
  private listener: Listener;
  constructor(camera: THREE.Camera) {
    Howler.autoUnlock = true; // Enable auto unlocking on user interaction
    this.listener = new Listener(camera);
  }

  loadSound(key: string, loop: boolean = false, volume: number = 1.0, ext: string = "ogg"): void {
    if (this.sounds.has(key)) {
      console.warn(`Sound with key "${key}" is already loaded.`);
      return;
    }
    const sound = new Howl({
      src: [AudioPath(`${key}.${ext}`)],
      loop: loop,
      volume: volume
    });
    this.sounds.set(key, sound);
  }

  loadSounds(keys: string[], loop: boolean = false, volume: number = 1.0, ext: string = "ogg"): void {
    keys.forEach(key => this.loadSound(key, loop, volume, ext));
  }

  playSound(key: string, pitchShift: boolean = true, pitchShiftRange: number = 0.3): void {
    const sound = this.sounds.get(key);
    if (!sound) {
      console.error(`Sound with key "${key}" not found.`);
      return;
    }
    if (pitchShift) {
      sound.rate(0.9 + Math.random() * pitchShiftRange)
    }
    sound.play();
  }

  playSound3D(key: string, target: THREE.Vector3 | THREE.Object3D, pitchShift: boolean = true, pitchShiftRange: number = 0.3): number | undefined {
    const sound = this.sounds.get(key);
    if (!sound) {
      console.error(`Sound with key "${key}" not found.`);
      return;
    }
    const position = target instanceof THREE.Object3D ? target.position : target;
    const usingWebAudio = Howler.usingWebAudio;
    if (typeof sound.pos === "function" && usingWebAudio) {
      // slight pitch variation
      if (pitchShift) {
        sound.rate(0.9 + Math.random() * pitchShiftRange)
      }
      // play sound at position
      const id = sound.play()
      if (typeof id === "number") {
        sound.pannerAttr({
          refDistance: 3,
          rolloffFactor: 1.0,
          distanceModel: "inverse",
          coneInnerAngle: 360,
          coneOuterAngle: 360,
          coneOuterGain: 0,
          panningModel: "HRTF"
        }, id)
        sound.pos(position.x, position.y, position.z, id)
      }
      return id
    }
    // fallback: stereo pan based on x if WebAudio 3D is unavailable
    const x = position.x
    const pan = Math.max(-1, Math.min(1, x / 20))
    sound.stereo?.(pan)
    return sound.play();
  }

  playMusic(key: string, fadeDuration: number = 2000): void {
    if (this.currentMusic) {
      this.currentMusic.fade(this.currentMusic.volume(), 0, fadeDuration);
      setTimeout(() => {
        this.currentMusic?.stop();
      }, fadeDuration);
    }
    const music = this.sounds.get(key);
    if (!music) {
      console.error(`Music with key "${key}" not found.`);
      return;
    }
    music.play();
    const newMusicVolume = music.volume();
    music.volume(0);
    this.currentMusic = music;
    this.currentMusic.fade(0, newMusicVolume, fadeDuration);
  }

  stopSound(key: string): void {
    const sound = this.sounds.get(key);
    if (!sound) {
      console.error(`Sound with key "${key}" not found.`);
      return;
    }
    sound.stop();
  }

  stopMusic(fadeDuration: number = 2000): void {
    if (this.currentMusic) {
      this.currentMusic.fade(this.currentMusic.volume(), 0, fadeDuration);
      setTimeout(() => {
        this.currentMusic?.stop();
        this.currentMusic = null;
      }, fadeDuration);
    }
  }

  setVolume(key: string, volume: number): void {
    const sound = this.sounds.get(key);
    if (!sound) {
      console.error(`Sound with key "${key}" not found.`);
      return;
    }
    sound.volume(volume);
  }

  unloadSound(key: string): void {
    const sound = this.sounds.get(key);
    if (!sound) {
      console.error(`Sound with key "${key}" not found.`);
      return;
    }
    sound.unload();
    this.sounds.delete(key);
  }

  unloadAllSounds(): void {
    this.sounds.forEach((sound, key) => {
      sound.unload();
    });
    this.sounds.clear();
  }

  update(args: UpdateArgs) {
    this.listener.update();
  }

  dispose(): void {
    this.stopMusic(0);
    this.unloadAllSounds();
    this.listener.dispose();
    this.listener = null as any;
  }
}