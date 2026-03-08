import { getDefaultBackground, getDefaultFontStyle } from "../editorutils";
import { BuilderPort, BuilderPortConfig } from "./builderport";
import { EntityBuilderPanel } from "./entitybuilderpanel";
import { NodeType, PortType, PortDirection } from "./types";

function getPortConfig(node: BuilderNode, label: string, type: PortType, direction: PortDirection): BuilderPortConfig {
  return {
    node,
    x: direction === PortDirection.Input ? 10 : node.width - 15,
    y: 25 + (direction === PortDirection.Input ? node.inputs.length : node.outputs.length) * 20,
    label,
    type,
    direction,
    color: type === PortType.Exec ? 0xffffff : 0xffff00,
    hoveredColor: type === PortType.Exec ? 0x777777 : 0xffff77,
    };
  }

function createDataInputPort(node: BuilderNode, label: string) {
  const port = new BuilderPort(getPortConfig(node, label, PortType.Data, PortDirection.Input));
  node.add(port);
  node.inputs.push(port);
}

function createExecInputPort(node: BuilderNode, label: string) {
  const port = new BuilderPort(getPortConfig(node, label, PortType.Exec, PortDirection.Input));
  node.add(port);
  node.inputs.push(port);
}

function createDataOutputPort(node: BuilderNode, label: string) {
  const port = new BuilderPort(getPortConfig(node, label, PortType.Data, PortDirection.Output));
  node.add(port);
  node.outputs.push(port);
}

function createExecOutputPort(node: BuilderNode, label: string) {
  const port = new BuilderPort(getPortConfig(node, label, PortType.Exec, PortDirection.Output));
  node.add(port);
  node.outputs.push(port);
}

export class BuilderNode extends Phaser.GameObjects.Container {
  inputs: BuilderPort[];
  outputs: BuilderPort[];
  constructor(panel: EntityBuilderPanel, x: number, y: number, label: string, nodeType: NodeType = NodeType.Function) {
    super(panel.scene, x, y);
    const bgd = getDefaultBackground(panel.scene, { x: 150, y: 80 });
    bgd.setOrigin(0);
    this.add(bgd);
    const text = panel.scene.add.text(0, 0, label, getDefaultFontStyle());
    text.setOrigin(0);
    this.add(text);
    this.setSize(150, 80);
    this.setInteractive({ 
      draggable: true, 
      cursor: "move",
      hitArea: new Phaser.Geom.Rectangle(this.width / 2, this.height/2, this.width, this.height),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains
     });
    this.on("drag", (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      this.x = dragX;
      this.y = dragY;
    });
    this.inputs = [];
    this.outputs = [];

    if (nodeType === NodeType.Function) {
      createExecInputPort(this, "exec");
      createExecOutputPort(this, "exec");
    } else if (nodeType === NodeType.Start) {
      createExecOutputPort(this, "exec");
    } else if (nodeType === NodeType.End) {
      createExecInputPort(this, "exec");
    } else if (nodeType === NodeType.Variable) {
      this.addDataPort("value", true);
      this.addDataPort("value", false);
    } else if (nodeType === NodeType.Event) {
      createExecOutputPort(this, "exec");
    }
  }

  addDataPort(label: string, isOutput: boolean) {
    if (isOutput) {
      createDataOutputPort(this, label);
    } else {
      createDataInputPort(this, label);
    }
  }
}