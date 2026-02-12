import * as THREE from 'three';
import { EffectComposer, FXAAShader, OutlinePass, OutputPass, RenderPass, RenderPixelatedPass, ShaderPass } from 'three/examples/jsm/Addons.js';
import { Shader } from './core';
import { PosterizeShader } from './shaders/PosterizeShader';
import { ThreeSceneBase } from './threescenebase';

/** 
 * Post-processing manager for Three.js scenes, utilizing EffectComposer for chaining multiple post-processing passes. 
 * Start with addRenderPass() to render the scene, then add additional passes like addFXAAPass() or custom shader passes, 
 * and finish with addOutputPass() to display the final result. 
 */
export class PostProcess {
  composer: EffectComposer;
  threeScene: THREE.Scene;
  camera: THREE.Camera;
  private outlinePasses: Map<string, OutlinePass> = new Map();
  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.composer = new EffectComposer(renderer);
    this.threeScene = scene;
    this.camera = camera;
  }

  render() {
    this.composer.render();
  }

  dispose() {
    this.composer.dispose();
    this.threeScene = null as any;
    this.camera = null as any;
  }

  /** Adds a standard render pass to the post-processing chain, which renders the scene as the first step in the chain. */
  addRenderPass(): this {
    const renderPass = new RenderPass(this.threeScene, this.camera);
    this.composer.addPass(renderPass);
    return this;
  }

  /** Adds a pixelation effect pass to the post-processing chain, which renders the scene with a pixelated look. */
  addRenderPixelatedPass(pixelSize: number = 4): this {
    const pixelPass = new RenderPixelatedPass(pixelSize, this.threeScene, this.camera);
    this.composer.addPass(pixelPass);
    return this;
  }

  /** Adds a simple output pass to the post-processing chain, which renders the final result to the screen. */
  addOutputPass(): void {
    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }

  /** Adds an FXAA anti-aliasing pass to the post-processing chain. */
  addFXAAPass(): this {
    const fxaaPass = new ShaderPass(FXAAShader);
    fxaaPass.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
    this.composer.addPass(fxaaPass);
    return this;
  }

  /** Adds a custom shader pass to the post-processing chain, allowing for any shader effect to be applied to the rendered scene. */
  addShaderPass(shader: Shader): this {
    const shaderPass = new ShaderPass(shader);
    this.composer.addPass(shaderPass);
    return this;
  }

  /** Adds a custom posterization shader pass to the post-processing chain, which reduces color depth and applies gamma correction for a stylized look. */
  addPosterizePass(levels: number = 50, gamma: number = 1.0): this {
    const posterizePass = new ShaderPass(PosterizeShader);
    posterizePass.uniforms['levels'].value = levels;
    posterizePass.uniforms['gamma'].value = gamma;
    this.composer.addPass(posterizePass);
    return this;
  }

  addOutline(name: string, scene: ThreeSceneBase, { edgeStrength = 5, edgeThickness = 1, visibleEdgeColor = '#ffff00', hiddenEdgeColor = '#ffff00', pulsePeriod=0, selectedObjects = [] } = {}): this {
    if (this.outlinePasses.has(name)) {
      console.warn(`Outline pass with name "${name}" already exists. Skipping addOutline.`);
      return this;
    }
    const outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, scene.getCamera());
    outlinePass.selectedObjects = selectedObjects;
    outlinePass.edgeStrength = edgeStrength;
    outlinePass.edgeThickness = edgeThickness;
    outlinePass.visibleEdgeColor.set(visibleEdgeColor);
    outlinePass.hiddenEdgeColor.set(hiddenEdgeColor);
    outlinePass.pulsePeriod = pulsePeriod;
    this.composer.addPass(outlinePass);
    this.outlinePasses.set(name, outlinePass);
    return this;
  }

  getOutlinePass(name: string): OutlinePass | null {
    return this.outlinePasses.get(name) || null;
  }

  setOutlineSelectedObjects(name: string, selectedObjects: THREE.Object3D[]): void {
    const outlinePass = this.getOutlinePass(name);
    if (outlinePass) {
      outlinePass.selectedObjects = selectedObjects;
    }
  }  
}