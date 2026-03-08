import { createDefaultDeleteButton } from "./deletebutton";
import { createInputBox } from "./editableproperty";


export enum ItemType {
  Component,
  Method,
  Property,
}

export interface ScrollBoxItem {
  name: string;
  itemType: ItemType;
  userData: any;
  onChange?: (property: string, newValue: any) => void;
  onClick?: (container: Phaser.GameObjects.Container, item: ScrollBoxItem) => void;
  onEnter?: () => void;
}

export class ScrollBox extends Phaser.GameObjects.Container {
  content: Phaser.GameObjects.Container;
  private readonly viewportHeight: number;
  private nextContentY: number = 10;
  private readonly paddingX: number = 10;
  private readonly itemSpacing: number = 1;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
    super(scene, x, y);
    this.viewportHeight = height;
    this.setScrollFactor(0);
    this.content = scene.add.container(0, 0);
    this.content.setScrollFactor(0);
    this.add(this.content);

    const bgd = scene.add.rectangle(0, 0, width, height, 0x222222, 0.2);
    bgd.setOrigin(0, 0);
    bgd.setStrokeStyle(2, 0xffffff, 0.5);
    bgd.setScrollFactor(0);
    this.add(bgd);
    this.setSize(width, height);

    const scrollbarWidth = 6;
    const scrollbarX = this.width - scrollbarWidth - 2;
    const scrollbarY = 2;
    const scrollbarHeight = this.viewportHeight - 4;
    
    const scrollbarBg = this.scene.add.rectangle(scrollbarX, scrollbarY, scrollbarWidth, scrollbarHeight, 0x000000, 0.5);
    scrollbarBg.setOrigin(0, 0);
    scrollbarBg.setStrokeStyle(1, 0xffffff, 0.8);
    scrollbarBg.setScrollFactor(0);
    scrollbarBg.setInteractive({ useHandCursor: true });
    scrollbarBg.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      const localY = pointer.y - this.y - scrollbarY - scrollbarHeight * 1.25;
      const scrollPercent = localY / scrollbarHeight;
      const contentHeight = this.getContentHeight();
      const maxScroll = Math.max(0, contentHeight - this.viewportHeight - 6);
      this.content.y = -scrollPercent * maxScroll;
    });
    this.add(scrollbarBg);
    const scrollbarThumb = this.scene.add.rectangle(scrollbarX, scrollbarY, scrollbarWidth, 20, 0xffffff, 0.8);
    scrollbarThumb.setOrigin(0, 0);
    this.add(scrollbarThumb);

    scrollbarThumb.setInteractive({ useHandCursor: true });
    this.scene.input.setDraggable(scrollbarThumb);
    scrollbarThumb.on("drag", (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      const thumbMaxY = scrollbarHeight - scrollbarThumb.height;
      const clampedY = Phaser.Math.Clamp(dragY, scrollbarY, scrollbarY + thumbMaxY);
      scrollbarThumb.y = clampedY;

      const scrollPercent = (clampedY - scrollbarY) / thumbMaxY;
      const contentHeight = this.getContentHeight();
      const maxScroll = Math.max(0, contentHeight - this.viewportHeight);
      this.content.y = -scrollPercent * maxScroll;
    });
    
    this.scene.events.on("update", () => {
      const contentHeight = this.getContentHeight();
      const maxScroll = Math.max(0, contentHeight - this.viewportHeight);
      const scrollPercent = maxScroll > 0 ? -this.content.y / maxScroll : 0;
      const thumbMaxY = scrollbarHeight - scrollbarThumb.height;
      scrollbarThumb.y = scrollbarY + scrollPercent * thumbMaxY;
      if (contentHeight <= this.viewportHeight) {
        scrollbarThumb.setVisible(false);
      } else {
        scrollbarThumb.setVisible(true);
        scrollbarThumb.setSize(scrollbarWidth, Math.min(scrollbarHeight, (scrollbarHeight / contentHeight) * scrollbarHeight));
      }
    });

    scrollbarBg.on("wheel", (pointer: Phaser.Input.Pointer, deltaX: number, deltaY: number) => {
      const contentHeight = this.getContentHeight();
      const maxScroll = Math.max(0, contentHeight - this.viewportHeight);
      if (maxScroll > 0) {
        this.content.y = Phaser.Math.Clamp(this.content.y - deltaY / 6, -maxScroll, 0);
      }
    });
    scrollbarThumb.on("wheel", (pointer: Phaser.Input.Pointer, deltaX: number, deltaY: number) => {
      const contentHeight = this.getContentHeight();
      const maxScroll = Math.max(0, contentHeight - this.viewportHeight);
      if (maxScroll > 0) {
        this.content.y = Phaser.Math.Clamp(this.content.y - deltaY / 6, -maxScroll, 0);
      }
    });
  }

  setContent(items: ScrollBoxItem[]) {
    this.content.removeAll(true);
    this.nextContentY = 10;
    for (const item of items) {
      this.addContent(item);
    }
  }

  addContent(item: ScrollBoxItem) {
    const container = this.scene.add.container(this.paddingX, this.nextContentY);
    container.setData("itemData", item);
    const bgd = this.scene.add.rectangle(0, 0, this.width - this.paddingX * 2 - 6, 35, 0x333333, 0.8);
    bgd.setOrigin(0, 0);
    bgd.setStrokeStyle(1, 0xffffff, 0.8);
    bgd.setScrollFactor(0);
    bgd.setRounded(4);
    container.add(bgd);

    if (item.itemType === ItemType.Component) {
      const icon = this.scene.add.rectangle(10, 10, 10, 10, 0x8888ff);
      icon.setOrigin(0.5);
      container.add(icon);
      createInputBox({
        phaserScene: this.scene,
        container: container,
        name: item.name,
        value: item.name,
        position: { x: 20, y: 5 },
        width: this.width - this.paddingX * 2 - 40,
        onChange: (newValue) => {
          item.name = newValue;
          item.onChange?.("name", newValue);
        },
        onEnter: () => {
          item.onEnter?.();
        },
      });
    } else if (item.itemType === ItemType.Method) {
      const icon = this.scene.add.rectangle(10, 10, 10, 10, 0x88ff88);
      icon.setOrigin(0.5);
      container.add(icon);
      createInputBox({
        phaserScene: this.scene,
        container: container,
        name: item.name,
        value: item.name,
        position: { x: 20, y: 5 },
        width: this.width - this.paddingX * 2 - 40,
        onChange: (newValue) => {
          item.name = newValue;
          item.onChange?.("name", newValue);
        },
        onEnter: () => {
          item.onEnter?.();
        },
      });
    } else if (item.itemType === ItemType.Property) {
      const icon = this.scene.add.rectangle(10, 10, 10, 10, 0xff8888);
      icon.setOrigin(0.5);
      container.add(icon);
      const widthPerField = this.width / 4.15;
      createInputBox({
        phaserScene: this.scene,
        container: container,
        name: item.name,
        value: item.name,
        position: { x: 20, y: 5 },
        width: widthPerField,
        onChange: (newValue) => {
          item.name = newValue;
          item.onChange?.("name", newValue);
        },
        onEnter: () => {
          item.onEnter?.();
        },
      });
      createInputBox({
        phaserScene: this.scene,
        container: container,
        name: item.userData.propertyType || "string",
        value: item.userData.propertyType || "string",
        position: { x: 30 + widthPerField, y: 5 },
        width: widthPerField,
        onChange: (newValue) => {
          item.userData.propertyType = newValue;
          item.onChange?.("propertyType", newValue);
        },
        onEnter: () => {
          item.onEnter?.();
        },
      });
      createInputBox({
        phaserScene: this.scene,
        container: container,
        name: item.userData.propertyValue || "",
        value: item.userData.propertyValue || "",
        position: { x: 40 + widthPerField * 2, y: 5 },
        width: widthPerField,
        onChange: (newValue) => {
          item.userData.propertyValue = newValue;
          item.onChange?.("propertyValue", newValue);
        },
        onEnter: () => {
          item.onEnter?.();
        },
      });
    }

    const deleteButton = createDefaultDeleteButton({
      scene: this.scene,
      x: 10,
      y: 25,
      width: 14,
      height: 14,
      fontSize: "14px",
      onClick: () => {
        this.nextContentY -= container.height + this.itemSpacing;
        container.destroy();
        this.content.iterate((child: Phaser.GameObjects.GameObject) => {
          const maybeTransform = child as any;
          if (typeof maybeTransform.y === "number" && maybeTransform.y > container.y) {
            maybeTransform.y -= container.height + this.itemSpacing;
          }
        });
        this.getContentHeight();
      },
    });
    container.add(deleteButton);

    container.setSize(this.width - this.paddingX * 2 - 6, 35);
    container.setInteractive({ 
      useHandCursor: true,
      hitArea: new Phaser.Geom.Rectangle(container.width / 2, container.height / 2, this.width - this.paddingX * 2 - 6, 35),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains
     });
    container.on("pointerover", () => {
      bgd.setFillStyle(0x777777, 0.8);
    });
    container.on("pointerout", () => {
      bgd.setFillStyle(0x333333, 0.8);
    });
    container.on("pointerdown", () => {
      if (item.onClick) {
        item.onClick(container, item);
      } else {
        console.log(`Clicked on ${item.name}`);
      }
    });

    this.content.add(container);
    this.nextContentY += container.height + this.itemSpacing;
    this.getContentHeight();
  }

  shiftContent(deltaY: number) {
    this.content.iterate((child: Phaser.GameObjects.GameObject) => {
      const maybeTransform = child as any;
      if (typeof maybeTransform.y === "number") {
        maybeTransform.y += deltaY;
      }
    });
  }

  getAllItems(): ScrollBoxItem[] {
    const items: ScrollBoxItem[] = [];
    this.content.iterate((child: Phaser.GameObjects.GameObject) => {
      const itemData = child.getData("itemData") as ScrollBoxItem;
      if (itemData) {
        items.push(itemData);
      }
    });
    return items;
  }

  private getContentHeight(): number {
    if (this.content.length === 0) {
      return 0;
    }
    let maxBottom = 0;
    this.content.iterate((child: Phaser.GameObjects.GameObject) => {
      const maybeTransform = child as any;
      const childY = typeof maybeTransform.y === "number" ? maybeTransform.y : 0;
      const childHeight =
        typeof maybeTransform.displayHeight === "number"
          ? maybeTransform.displayHeight
          : typeof maybeTransform.height === "number"
            ? maybeTransform.height
            : 0;
      if ("visible" in child) {
        child.visible = childY + this.content.y + childHeight > 35 && childY + this.content.y < this.viewportHeight - childHeight;
      }
      maxBottom = Math.max(maxBottom, childY + childHeight);
    });
    return maxBottom + this.itemSpacing;
  }

  removeLastContent() {
    if (this.content.length > 0) {
      const lastChild = this.content.getAt(this.content.length - 1) as Phaser.GameObjects.Container;
      if (lastChild) {
        lastChild.destroy();
        this.nextContentY -= lastChild.height + this.itemSpacing;
        this.getContentHeight();
      }
    }
  }
}
