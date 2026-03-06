import * as THREE from "three";
import { Object3D } from "three";
import { EntityState, UpdateArgs } from "./shared";
import { EntityBase } from "./entitybase";
import { ThreeSceneBase } from "./threescenebase";
import { Entity } from "./entity";
import { getModel } from "./registry";
import { updateMaterialTexture } from "./utils";
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

function getGeometry(entityState: EntityState): THREE.BufferGeometry {
  const width = entityState.userData.width || 1;
  const height = entityState.userData.height || 1;
  const depth = entityState.userData.depth || 1;
  const segments = entityState.userData.segments || 16;
  const radius = entityState.userData.radius || 0.075;
  const entityType = entityState.entityType || entityState.userData.instancedMesh?.entityType || "Box";
  if (entityType === "Box") {
    return new THREE.BoxGeometry(width, height, depth);
  } else if (entityType === "RoundedBox") {
    return new RoundedBoxGeometry(width, height, depth, segments, radius);
  } else if (entityType === "Sphere") {
    return new THREE.SphereGeometry(radius, segments, segments);
  } else if (entityType === "Capsule") {
    return new THREE.CapsuleGeometry(radius, height, segments, segments);
  } else if (entityType === "Model" && entityState.userData.instancedMesh?.modelName) {
    const model = getModel(entityState.userData.instancedMesh.modelName);
    if (model) {
      return (model as THREE.Mesh).geometry as THREE.BufferGeometry;
    } else {
      console.warn(`InstancedMesh ${entityState.name} could not find model ${entityState.userData.instancedMesh.modelName}. Using box geometry.`);
      return new THREE.BoxGeometry(width, height, depth);
    }
  } else {
    return new THREE.BoxGeometry(width, height, depth);
  }
}

function getMaterial(entityState: EntityState): THREE.Material {
  const materialData = entityState.userData.material || entityState.userData.instancedMesh || {};
  materialData.color = materialData.color ?? 0x00ff00;
  let materialType = materialData.materialType || "MeshStandardMaterial";
  let material: THREE.Material;
  if (materialType === "MeshStandardMaterial") {
    material = new THREE.MeshStandardMaterial(materialData);
  } else if (materialType === "MeshBasicMaterial") {
    material = new THREE.MeshBasicMaterial(materialData);
  } else if (materialType === "MeshPhongMaterial") {
    material = new THREE.MeshPhongMaterial(materialData);
  } else if (materialType === "MeshLambertMaterial") {
    material = new THREE.MeshLambertMaterial(materialData);
  } else {
    material = new THREE.MeshStandardMaterial(materialData);
  }
  if (materialData.texture && "map" in material) {
    updateMaterialTexture(material, materialData, "map");
  }
  if (materialData.roughnessTexture && "roughnessMap" in material) {
    updateMaterialTexture(material, materialData, "roughnessMap");
  }
  if (materialData.metalnessTexture && "metalnessMap" in material) {
    updateMaterialTexture(material, materialData, "metalnessMap");
  }
  if (materialData.normalTexture && "normalMap" in material) {
    updateMaterialTexture(material, materialData, "normalMap");
  }
  return material;
}

/** A basic entity with no special behavior */
export class EntityGame extends EntityBase {
  constructor(threeScene: ThreeSceneBase, state: EntityState) {
    super(threeScene, state);
    this.setName(state.name);
  }

  createObject3D(entityState: EntityState): Object3D {
    const transform = entityState.userData.transform!;
    const width = entityState.userData.width * transform.scale.x;
    const height = entityState.userData.height * transform.scale.y;
    const depth = entityState.userData.depth * transform.scale.z;  
    entityState.userData.width = width;
    entityState.userData.height = height;
    entityState.userData.depth = depth;
    transform.scale = new THREE.Vector3(1, 1, 1);

    const materialData = entityState.userData.material || {};
    materialData.color = materialData.color ?? 0x00ff00;

    let geometry: THREE.BufferGeometry;
    if (entityState.entityType === "InstancedMesh") {
      const count = entityState.userData.instancedMesh?.count || 10;
      geometry = getGeometry(entityState);
      const material = getMaterial(entityState);
      const instancedMesh = new THREE.InstancedMesh(geometry, material, count);
      instancedMesh.castShadow = entityState.userData.instancedMesh?.castShadow ?? true;
      instancedMesh.receiveShadow = entityState.userData.instancedMesh?.receiveShadow ?? true;
      return instancedMesh;
    } else if (entityState.entityType === "Model" && entityState.userData.modelName) {
      const model = getModel(entityState.userData.modelName);
      if (model) {
        return model;
      } else {
        console.warn(`ModelEntity ${entityState.name} could not find model ${entityState.userData.modelName}. Using box geometry.`);
        geometry = getGeometry(entityState);
      }
    } else {
      geometry = getGeometry(entityState);
    }

    let material: THREE.Material = getMaterial(entityState);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = materialData.castShadow ?? true;
    mesh.receiveShadow = materialData.receiveShadow ?? true;

    return mesh;
  }  

  onCollide(otherEntity: Entity, started: boolean): void { }
  onUpdate(args: UpdateArgs): void { }
  onDestroy(): void { }
}