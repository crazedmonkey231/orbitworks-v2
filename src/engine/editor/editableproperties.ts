import * as THREE from "three";
import { GameplayTags, PhysicsData } from "../shared";
import { roundToDecimals, roundXYZ, roundQuaternion } from "../utils";
import { EditableProperty } from "./editableproperty";
import { Editor } from "./editor";

export function getEditableProperties(
  editor: Editor,
): Partial<EditableProperty>[] {
  const selected = editor.getSelectedEntity();
  if (!selected) {
    return [];
  }
  const editableProperties: Partial<EditableProperty>[] = [
    {
      name: "Name",
      value: selected.state.name,
      onChange: (newValue) => {
        selected.state.name = newValue;
      },
    },
    {
      name: "Entity Type",
      value: selected.state.entityType,
      onChange: (newValue) => {
        // selected!.state.entityType = newValue;
        // Split by # to allow changing type and adding JSON data for components in the future, e.g. "Enemy#{"health":100}"
        const parts = newValue.split("#").map((part: string) => part.trim());
        selected.state.entityType = parts[0];
        if (parts.length > 1) {
          try {
            const extraData = JSON.parse(parts[1]);
            Object.assign(selected.state.userData, extraData);
          } catch (error) {
            // console.warn("Failed to parse extra data JSON:", error);
          }
        }
      },
    },
    {
      name: "Tags",
      value: selected.state.tags.join(", "),
      onChange: (newValue) => {
        selected.state.tags = newValue
          .split(",")
          .map((tag: string) => tag.trim());
      },
    },
    {
      name: "Gameplay Tags",
      value: selected.state.gameplayTags.join(", "),
      onChange: (newValue) => {
        const newTags = newValue.split(",").map((tag: string) => tag.trim());
        const filteredTags = newTags.filter(
          (tag: string) =>
            GameplayTags[tag as keyof typeof GameplayTags] !== undefined,
        );
        selected.state.gameplayTags = filteredTags;
      },
    },
    {
      name: "Components",
      value: selected.state.components.map((comp: any) => comp.name).join("&"),
      onChange: (newValue) => {
        // Splits the input by &, then by # to separate component name and JSON data, and constructs the components array. Better UI later...
        const newComponentNames = newValue
          .split("&")
          .map((name: string) => name.trim());
        const newComponents = [];
        for (const compName of newComponentNames) {
          try {
            const comp = compName.split("#").map((part: string) => part.trim());
            if (comp.length === 2) {
              newComponents.push({
                name: comp[0],
                compType: comp[0],
                ...JSON.parse(comp[1]),
              });
            } else {
              newComponents.push({ name: comp[0], compType: comp[0] });
            }
          } catch (error) {
            // console.warn("Failed to parse component data JSON:", error);
          }
        }
        selected.state.components = newComponents;
      },
    },
    {
      name: "Box Data",
      value: `${selected.state.userData.width?.toFixed(
        2,
      )}, ${selected.state.userData.height?.toFixed(
        2,
      )}, ${selected.state.userData.depth?.toFixed(2)}`,
      onChange: (newValue) => {
        const pos = newValue
          .split(",")
          .map((coord: string) => parseFloat(coord.trim()));
        if (pos.length === 3) {
          selected.state.userData.width = roundToDecimals(pos[0]);
          selected.state.userData.height = roundToDecimals(pos[1]);
          selected.state.userData.depth = roundToDecimals(pos[2]);
        }
      },
    },
    {
      name: "Sphere Data",
      value: `${selected.state.userData.radius?.toFixed(
        2,
      )}, ${selected.state.userData.segments?.toFixed(2)}`,
      onChange: (newValue) => {
        const pos = newValue
          .split(",")
          .map((coord: string) => parseFloat(coord.trim()));
        if (pos.length === 2) {
          selected.state.userData.radius = roundToDecimals(pos[0]);
          selected.state.userData.segments = roundToDecimals(pos[1]);
        }
      },
    },
    {
      name: "Position",
      value: `${selected.state.userData.transform!.position.x.toFixed(
        2,
      )}, ${selected.state.userData.transform!.position.y.toFixed(
        2,
      )}, ${selected.state.userData.transform!.position.z.toFixed(2)}`,
      onChange: (newValue) => {
        const pos = newValue
          .split(",")
          .map((coord: string) => parseFloat(coord.trim()));
        if (pos.length === 3) {
          selected.state.userData.transform!.position = roundXYZ(
            pos[0],
            pos[1],
            pos[2],
          );
        }
      },
    },
    {
      name: "Rotation",
      value: `${THREE.MathUtils.radToDeg(
        selected.state.userData.transform!.rotation.x,
      ).toFixed(2)}, ${THREE.MathUtils.radToDeg(
        selected.state.userData.transform!.rotation.y,
      ).toFixed(2)}, ${THREE.MathUtils.radToDeg(
        selected.state.userData.transform!.rotation.z,
      ).toFixed(2)}`,
      onChange: (newValue) => {
        const rot = newValue
          .split(",")
          .map((angle: string) =>
            THREE.MathUtils.degToRad(parseFloat(angle.trim())),
          );
        if (rot.length === 3) {
          let rotation = new THREE.Euler(
            roundToDecimals(rot[0]),
            roundToDecimals(rot[1]),
            roundToDecimals(rot[2]),
          );
          let quaternion = new THREE.Quaternion().setFromEuler(rotation);
          quaternion = roundQuaternion(quaternion);
          selected.state.userData.transform!.quaternion = quaternion;
          selected.state.userData.transform!.rotation = rotation;
        }
      },
    },
    {
      name: "Scale",
      value: `${selected.state.userData.transform!.scale.x.toFixed(
        2,
      )}, ${selected.state.userData.transform!.scale.y.toFixed(
        2,
      )}, ${selected.state.userData.transform!.scale.z.toFixed(2)}`,
      onChange: (newValue) => {
        const scale = newValue
          .split(",")
          .map((factor: string) => parseFloat(factor.trim()));
        if (scale.length === 3) {
          let newScale = new THREE.Vector3(
            roundToDecimals(scale[0]),
            roundToDecimals(scale[1]),
            roundToDecimals(scale[2]),
          );
          newScale = roundXYZ(newScale.x, newScale.y, newScale.z);
          selected.state.userData.transform!.scale = newScale;
        }
      },
    },
    {
      name: "Mass",
      value: selected.state.userData.physicsData?.mass?.toString() || "0",
      onChange: (newValue) => {
        const mass = parseFloat(newValue);
        if (!isNaN(mass)) {
          if (!selected.state.userData.physicsData) {
            selected.state.userData.physicsData = {
              mass: mass,
            } as PhysicsData;
          } else {
            selected.state.userData.physicsData!.mass = roundToDecimals(mass);
          }
        }
      },
    },
    {
      name: "Friction",
      value: selected.state.userData.physicsData?.friction?.toString() || "0",
      onChange: (newValue) => {
        const friction = parseFloat(newValue);
        if (!isNaN(friction)) {
          if (!selected.state.userData.physicsData) {
            selected.state.userData.physicsData = {
              friction: friction,
            } as PhysicsData;
          } else {
            selected.state.userData.physicsData!.friction =
              roundToDecimals(friction);
          }
        }
      },
    },
    {
      name: "Density",
      value: selected.state.userData.physicsData?.density?.toString() || "0",
      onChange: (newValue) => {
        const density = parseFloat(newValue);
        if (!isNaN(density)) {
          if (!selected.state.userData.physicsData) {
            selected.state.userData.physicsData = {
              density: density,
            } as PhysicsData;
          } else {
            selected.state.userData.physicsData!.density =
              roundToDecimals(density);
          }
        }
      },
    },
    {
      name: "Restitution",
      value:
        selected.state.userData.physicsData?.restitution?.toString() || "0",
      onChange: (newValue) => {
        const restitution = parseFloat(newValue);
        if (!isNaN(restitution)) {
          if (!selected.state.userData.physicsData) {
            selected.state.userData.physicsData = {
              restitution: restitution,
            } as PhysicsData;
          } else {
            selected.state.userData.physicsData!.restitution =
              roundToDecimals(restitution);
          }
        }
      },
    },
  ];
  return editableProperties;
}
