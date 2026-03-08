import { EditableProperty } from "../editableproperty";
import { getDefaultBackground, getDefaultFontStyle } from "../editorutils";
import { ItemType, ScrollBoxItem } from "../scrollbox";
import { EntityBuilderPanel } from "./entitybuilderpanel";
import { Viewer } from "./viewer";
import { Editor } from '../editor';
import { getEditableProperties } from '../editableproperties';

function convertPropertyToItem(editor: Editor, properties: Partial<EditableProperty>[]): ScrollBoxItem[] {
  for (const prop of properties) {
    if (prop.value === undefined) {
      prop.value = "";
    }
  }
  return properties.map(prop => ({
    name: prop.name || "-Missing-",
    itemType: ItemType.Property,
    userData: {
      isNew: false,
      propertyType: "string",
      propertyValue: prop.value || "",
    },
    onChange: (property, value) => {
      prop.onChange?.(value);
      editor.queueSceneStateChange();
    },
    onEnter: () => {
      prop.onEnter?.();
      editor.queueSceneStateChange();
    }
  }));
}

export class EntityDetailsPanel extends Phaser.GameObjects.Container {
  panel: EntityBuilderPanel;
  propertyViewer: Viewer;
  methodViewer: Viewer;
  componentViewer: Viewer;
  constructor(editor: Editor, panel: EntityBuilderPanel, x: number, y: number) {
    super(panel.scene, x, y);
    this.panel = panel;
    const bgd = getDefaultBackground(this.panel.scene, { x: 295, y: 711 });
    bgd.setOrigin(0, 0);
    bgd.setStrokeStyle(2, 0xffffff, 0.5);
    this.add(bgd);
    const title = panel.scene.add.text(10, 10, "Entity Details", {
      ...getDefaultFontStyle(),
      fontSize: "16px",
    });
    title.setShadow(1, 1, "#000000", 2);
    this.add(title);

    const height = 215;

    // For properties, methods, and components, you would implement similar viewers with their own add/remove logic and item structures.
    this.propertyViewer = new Viewer(this, 0, 65, 295, height, "Properties",
      () => {
        console.log("Add property clicked");
        this.propertyViewer.scrollBox.addContent({
          name: `Property${this.propertyViewer.scrollBox.getAllItems().length + 1}`,
          itemType: ItemType.Property,
          userData: { 
            isNew: true,
            propertyType: "string",
            propertyValue: "",
           },
          onClick: (container, item) => {
            console.log(`Clicked on ${item.name} with data:`, item.userData);
            // Here you could open a detailed view for the clicked component
          }
        });
      },
      () => {
        console.log("Remove property clicked");
        this.propertyViewer.scrollBox.removeLastContent();
      }
    );

    const editableProperties: Partial<EditableProperty>[] = getEditableProperties(editor);
    this.propertyViewer.scrollBox.setContent(convertPropertyToItem(editor, editableProperties));
    this.add(this.propertyViewer);

    // For methods and components, you would implement similar viewers with their own add/remove logic and item structures.
    this.methodViewer = new Viewer(this, 0, 65 + height, 295, height, "Scripts",
      () => {
        console.log("Add script clicked");
        this.methodViewer.scrollBox.addContent({
          name: `Script${this.methodViewer.scrollBox.getAllItems().length + 1}`,
          itemType: ItemType.Method,
          userData: {
            methodBody: "",
          },
          onClick: (container, item) => {
            console.log(`Clicked on ${item.name}`);
            // Here you could open a detailed view for the clicked method
          }
        });
      },
      () => {
        console.log("Remove method clicked");
        this.methodViewer.scrollBox.removeLastContent();
      }
    );
    this.add(this.methodViewer);

    // For components, you would implement similar viewers with their own add/remove logic and item structures.
    this.componentViewer = new Viewer(this, 0, 65 + height * 2, 295, height, "Components",
      () => {
        console.log("Add component clicked");
        this.componentViewer.scrollBox.addContent({
          name: `Component${this.componentViewer.scrollBox.getAllItems().length + 1}`,
          itemType: ItemType.Component,
          userData: {},
          onClick: (container, item) => {
            console.log(`Clicked on ${item.name}`);
            // Here you could open a detailed view for the clicked component
          }
        });
      },
      () => {
        console.log("Remove component clicked");
        this.componentViewer.scrollBox.removeLastContent();
      }
    );
    this.add(this.componentViewer);

    this.scene.input.keyboard?.on("keydown-P", () => {
      console.log(this.propertyViewer.scrollBox.getAllItems().filter(item => item.userData.isNew));
    });
  }
}
  