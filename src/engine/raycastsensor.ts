import * as THREE from 'three';

const UP_AXIS = new THREE.Vector3(0, 1, 0);

/** A raycast array that is used for detecting objects in a specified arc or 360 degrees to determine a movement path */
export class RaycastSensor {
  private raycaster: THREE.Raycaster;
  private numRays: number;
  private rayLength: number;
  private _tmpIntersections: THREE.Intersection[] = [];

  constructor(numRays: number, rayLength: number) {
    this.raycaster = new THREE.Raycaster();
    this.numRays = numRays;
    this.rayLength = rayLength;
  }

  /** Cast rays in a specified arc and return the hit results */
  castRays(origin: THREE.Vector3, direction: THREE.Vector3, arcAngle: number, objects: THREE.Object3D[]): THREE.Intersection[] {
    const hits: THREE.Intersection[] = [];
    const angleStep = arcAngle / (this.numRays - 1);
    const halfArc = arcAngle / 2;
    this._tmpIntersections.length = 0; // Clear the temporary intersections array
    for (let i = 0; i < this.numRays; i++) {
      const angle = -halfArc + i * angleStep;
      const rayDirection = direction.clone().applyAxisAngle(UP_AXIS, angle).normalize();
      this.raycaster.set(origin, rayDirection);
      this.raycaster.far = this.rayLength;
      const intersections = this.raycaster.intersectObjects(objects, false, this._tmpIntersections);
      hits.push(...intersections);
    }
    return hits;
  }

  /** Cast rays in a full 360 degree circle and return the hit results */
  castRays360(origin: THREE.Vector3, objects: THREE.Object3D[]): THREE.Intersection[] {
    const hits: THREE.Intersection[] = [];
    const angleStep = 360 / this.numRays;
    this._tmpIntersections.length = 0; // Clear the temporary intersections array
    for (let i = 0; i < this.numRays; i++) {
      const angle = i * angleStep;
      const rayDirection = new THREE.Vector3(0, 0, 1).applyAxisAngle(UP_AXIS, angle).normalize();
      this.raycaster.set(origin, rayDirection);
      this.raycaster.far = this.rayLength;
      const intersections = this.raycaster.intersectObjects(objects, true, this._tmpIntersections);
      hits.push(...intersections);
    }
    return hits;
  }

  /** Find best movement direction to a target position based on raycast hits to avoid obstacles */
  findBestDirection(origin: THREE.Vector3, target: THREE.Vector3, arcAngle: number, objects: THREE.Object3D[]): THREE.Vector3 {
    const directionToTarget = target.clone().sub(origin).normalize();
    const hits = this.castRays(origin, directionToTarget, arcAngle, objects);
    if (hits.length === 0) {
      return directionToTarget; // No obstacles, move directly towards target
    }
    // Find the ray with the least obstruction (closest hit)
    let bestDirection = directionToTarget;
    let minDistance = Infinity;
    for (const hit of hits) {
      if (hit.distance < minDistance) {
        minDistance = hit.distance;
        // Calculate a new direction that is slightly away from the hit normal to try to avoid the obstacle
        bestDirection = hit.face?.normal.clone().add(directionToTarget).normalize() || directionToTarget;
      }
    }
    return bestDirection;
  }

  /** Find best movement direction in a 360 degree circle to a target position based on raycast hits to avoid obstacles */
  findBestDirection360(origin: THREE.Vector3, target: THREE.Vector3, objects: THREE.Object3D[]): THREE.Vector3 {
    const directionToTarget = target.clone().sub(origin).normalize();
    const hits = this.castRays360(origin, objects);
    if (hits.length === 0) {
      return directionToTarget; // No obstacles, move directly towards target
    }
    // Find the ray with the least obstruction (closest hit)
    let bestDirection = directionToTarget;
    let minDistance = Infinity;
    for (const hit of hits) {
      if (hit.distance < minDistance) {
        minDistance = hit.distance;
        // Calculate a new direction that is slightly away from the hit normal to try to avoid the obstacle
        bestDirection = hit.face?.normal.clone().add(directionToTarget).normalize() || directionToTarget;
      }
    }
    return bestDirection;
  }
}
