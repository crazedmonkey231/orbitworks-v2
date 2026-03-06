import * as THREE from "three";
import { EntityComponentState, EntityState } from "../../shared";
import { createEntity } from "../../entityfactory";
import { ThreeSceneBase } from "../../threescenebase";

export function getParticleBurstConfig(
  spawnPosition: THREE.Vector3,
  components: EntityComponentState[],
  radius: number = 0.5,
): EntityState {
  const particleData: EntityState | any = {
    name: "ParticleBurst",
    entityType: "Sphere",
    components: components,
    userData: {
      radius: radius,
      segments: 8,
      transform: {
        position: spawnPosition,
        quaternion: new THREE.Quaternion(0, 0, 0, 1),
        rotation: new THREE.Euler(0, 0, 0),
        scale: new THREE.Vector3(1, 1, 1),
      },
      physicsData: {
        mass: 0,
      },
      material: {
        color: 0x000000,
        transparent: true,
        opacity: 0,
      },
    },
  };
  return particleData;
}

export function createParticleBurst(
  threeScene: ThreeSceneBase,
  spawnPosition: THREE.Vector3,
  radius: number = 0.5,
  color: any = 0xffaa88,
  particleLifetime: number = 300,
  gravityY: number = 5,
) {
  const particleBurst = createEntity(
    threeScene,
    getParticleBurstConfig(
      spawnPosition,
      [
        {
          name: "ParticleBurst",
          compType: "ParticleBurst",
          color: color,
          opacity: 0.25,
          emissiveIntensity: 1,
          lifetime: particleLifetime,
          speed: 25,
          gravityY: gravityY,
        },
      ],
      radius,
    ),
  );
  threeScene.addEntity(particleBurst, false);
  setTimeout(() => {
    particleBurst.kill();
  }, particleLifetime);
}
