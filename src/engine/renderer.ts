import * as THREE from "three";

// set up three.js renderer in a canvas behind Phaser's canvas
const app: any = document.getElementById("app");
const threeCanvas = document.createElement("canvas");
threeCanvas.className = "three";
app.prepend(threeCanvas); // behind Phaser

// three.js renderer
export const renderer = new THREE.WebGLRenderer({
  canvas: threeCanvas,
  antialias: true,
  alpha: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.setClearColor(0x000000, 0);
renderer.setSize(app.clientWidth, app.clientHeight, false);

// PMREM generator for environment maps
export const premGenerator = new THREE.PMREMGenerator(renderer);
premGenerator.compileEquirectangularShader();

// handle resizing
export function resizeThree(camera: any) {
  const rect = app.getBoundingClientRect();
  const w = Math.max(1, rect.width);
  const h = Math.max(1, rect.height);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}
