import * as THREE from "three";
import { Sky } from "three/examples/jsm/Addons.js";
import { premGenerator, renderer } from "./game";
import { UpdateArgs, WeatherState } from "./core";

/** 
 * Manages weather effects, time of day, and related environmental settings in the scene.
 */
export class WeatherManager {
  private name: string = "WeatherManager";
  private threeScene: THREE.Scene;
  private timeofDay: number = 10; // 0-24
  private sky: Sky | null = null;
  private directionalLight: THREE.DirectionalLight | null = null;
  private ambientLight: THREE.AmbientLight | null = null;
  private hemisphericLight: THREE.HemisphereLight | null = null;
  private fog: THREE.FogExp2 | null = null;
  private sunPosition: THREE.Vector3 = new THREE.Vector3();
  private enabled: boolean = false;
  private lastUpdate: number = 0;
  private readonly premUpdateSpeed = 10000;
  private readonly dayUpdateSpeed = 300000; // 5 minutes per day cycle
  private readonly dayTime = 18;
  private readonly nightTime = 6;

  constructor(threeScene: THREE.Scene) {
    this.threeScene = threeScene;
    this.sky = new Sky();
    this.sky.scale.setScalar(450000);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.directionalLight.position.set(3, 25, 4);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.set(2048, 2048);
    this.directionalLight.shadow.camera.left = -50;
    this.directionalLight.shadow.camera.right = 50;
    this.directionalLight.shadow.camera.top = 50;
    this.directionalLight.shadow.camera.bottom = -50;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 200;
    this.directionalLight.shadow.bias = -0.0001;

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
    this.hemisphericLight = new THREE.HemisphereLight(0xffffff, 0.5);
    this.hemisphericLight.position.set(0, 25, 0);
    this.fog = new THREE.FogExp2(0xcce0ff, 0.01);
    
    this.threeScene.add(this.sky);
    this.threeScene.add(this.directionalLight);
    this.threeScene.add(this.ambientLight);
    this.threeScene.add(this.hemisphericLight);
    this.threeScene.fog = this.fog;

    // configure sky shader
    const skyUniforms = this.sky.material.uniforms;
    skyUniforms['turbidity'].value = 2;
    skyUniforms['rayleigh'].value = 1;
    skyUniforms['mieCoefficient'].value = 0.005;
    skyUniforms['mieDirectionalG'].value = 0.8;

    this.calculateSunPosition();
    this.threeScene.environment = premGenerator.fromScene(this.threeScene).texture;
  }

  getName(): string {
    return this.name;
  }

  toggle() {
    this.enabled = !this.enabled;
  }

  setEnabled(value: boolean) {
    this.enabled = value;
  }

  getEnabled(): boolean { 
    return this.enabled;
  }

  setTimeOfDay(hour: number, forceUpdate: boolean = false) {
    this.timeofDay = hour % 24;
    this.calculateSunPosition();
    if (forceUpdate) {
      this.threeScene.environment = premGenerator.fromScene(this.threeScene).texture;
    }
  }

  getTimeOfDay(): number {
    return this.timeofDay;
  }

  private calculateSunPosition() {
    const dayLength = this.dayTime - this.nightTime;
    const totalNightLength = 24 - dayLength;
    const offsetTime = (this.timeofDay - this.nightTime + 24) % 24;
    const inDay = offsetTime < dayLength;
    const cycleSpan = inDay ? dayLength : totalNightLength;
    const cycleTime = offsetTime - (inDay ? 0 : dayLength);
    const progress = cycleTime / cycleSpan;

    let theta: number;
    if (inDay) {
      theta = Math.PI * progress - Math.PI / 2;
    } else {
      theta = Math.PI * progress + Math.PI / 2;
    }

    const phi = 2 * Math.PI * 0.25;
    this.sunPosition.set(
      Math.cos(phi) * Math.sin(theta),
      Math.cos(theta),
      Math.sin(phi) * Math.sin(theta)
    );

    this.sky?.material.uniforms['sunPosition'].value.copy(this.sunPosition);
    renderer.toneMappingExposure = Math.max(0.1, this.sunPosition.y * 0.3);
    if (this.sky) this.sky.material.needsUpdate = true;

    this.directionalLight?.position.copy(this.sunPosition.clone().multiplyScalar(100));
    this.directionalLight?.lookAt(new THREE.Vector3(0, 0, 0));
    this.directionalLight?.updateMatrixWorld();
    this.directionalLight!.intensity = Math.max(0.1, this.sunPosition.y * 0.5 + 0.5);

    this.ambientLight!.intensity = Math.max(0.1, this.sunPosition.y * 0.5 + 0.5);
    this.hemisphericLight!.intensity = Math.max(0.1, this.sunPosition.y * 0.5 + 0.5);
  }

  update(args: UpdateArgs) {
    const delta = args.deltaTime;
    if (!this.enabled) return;
    // update time of day
    this.timeofDay += delta / this.dayUpdateSpeed * 24;
    this.timeofDay %= 24;
    this.calculateSunPosition();
    this.lastUpdate += delta;
    // update environment according to the prem update speed
    if (this.lastUpdate > this.premUpdateSpeed) {
      this.lastUpdate = 0;
      this.threeScene.environment = premGenerator.fromScene(this.threeScene).texture;
    }
  }

  private removeResources() {
    const resources = [];
    if (this.sky) resources.push(this.sky);
    if (this.directionalLight) resources.push(this.directionalLight);
    if (this.ambientLight) resources.push(this.ambientLight);
    if (this.hemisphericLight) resources.push(this.hemisphericLight);
    for (const res of resources) {
      this.threeScene.remove(res);
    }
  }

  private disposeResources() {
    this.sky!.material.dispose();
    this.sky!.geometry.dispose();
    this.directionalLight?.dispose();
    this.ambientLight?.dispose();
    this.hemisphericLight?.dispose();
  }

  dispose() {
    this.enabled = false;
    this.removeResources();
    this.disposeResources();
    this.sky = null as any;
    this.directionalLight = null as any;
    this.ambientLight = null as any;
    this.hemisphericLight = null as any;
    this.fog = null;
    this.threeScene.fog = null;
    this.threeScene = null as any;
  }

  /** Exports the weather state to a JSON object. */
  saveState(): WeatherState {
    return {
      enabled: this.enabled,
      timeOfDay: this.timeofDay,
    };
  }

  /** Loads the weather state from a JSON object. */
  loadState(state: any): void {
    if (state.timeOfDay !== undefined) {
      this.setTimeOfDay(state.timeOfDay, true);
    }
    if (state.enabled !== undefined) {
      this.setEnabled(state.enabled);
    }
  }
}