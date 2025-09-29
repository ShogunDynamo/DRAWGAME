import { Canvas, PencilBrush, Rect, Circle, IText, FabricObject } from "fabric";

interface FabricCanvasOptions {
  onDrawingUpdate?: (canvasData: string) => void;
  onSelectionChanged?: (selection: FabricObject | null) => void;
}

export class FabricCanvas {
  private canvas: Canvas;
  private isDrawing = false;
  private currentTool = "brush";
  private brushSize = 5;
  private opacity = 1;
  private color = "#000000";
  private options: FabricCanvasOptions;

  constructor(canvasElement: HTMLCanvasElement, options: FabricCanvasOptions = {}) {
    this.options = options;
    
    this.canvas = new Canvas(canvasElement, {
      backgroundColor: "#ffffff",
      selection: true,
      preserveObjectStacking: true,
      width: 900,
      height: 600,
    });

    this.setupEventListeners();
    this.setTool("brush");
  }

  private setupEventListeners() {
    this.canvas.on("path:created", () => {
      this.onCanvasModified();
    });

    this.canvas.on("object:added", () => {
      this.onCanvasModified();
    });

    this.canvas.on("object:removed", () => {
      this.onCanvasModified();
    });

    this.canvas.on("object:modified", () => {
      this.onCanvasModified();
    });

    this.canvas.on("selection:created", (e: any) => {
      this.options.onSelectionChanged?.(e.selected?.[0] || null);
    });

    this.canvas.on("selection:updated", (e: any) => {
      this.options.onSelectionChanged?.(e.selected?.[0] || null);
    });

    this.canvas.on("selection:cleared", () => {
      this.options.onSelectionChanged?.(null);
    });
  }

  private onCanvasModified() {
    if (this.options.onDrawingUpdate) {
      const canvasData = this.toJSON();
      this.options.onDrawingUpdate(canvasData);
    }
  }

  setTool(tool: string) {
    this.currentTool = tool;
    
    switch (tool) {
      case "brush":
        this.canvas.isDrawingMode = true;
        this.canvas.freeDrawingBrush = new PencilBrush(this.canvas);
        this.updateBrushSettings();
        break;
        
      case "pencil":
        this.canvas.isDrawingMode = true;
        this.canvas.freeDrawingBrush = new PencilBrush(this.canvas);
        if (this.canvas.freeDrawingBrush) {
          this.canvas.freeDrawingBrush.width = Math.max(1, this.brushSize * 0.5);
          this.canvas.freeDrawingBrush.color = this.color;
        }
        break;
        
      case "eraser":
        this.canvas.isDrawingMode = true;
        this.canvas.freeDrawingBrush = new PencilBrush(this.canvas);
        if (this.canvas.freeDrawingBrush) {
          this.canvas.freeDrawingBrush.width = this.brushSize;
          this.canvas.freeDrawingBrush.color = "#ffffff";
        }
        break;
        
      case "circle":
      case "rectangle":
      case "text":
      case "eyedropper":
      case "fill":
        this.canvas.isDrawingMode = false;
        this.canvas.selection = true;
        break;
        
      default:
        this.canvas.isDrawingMode = false;
        this.canvas.selection = true;
    }
  }

  private updateBrushSettings() {
    if (this.canvas.freeDrawingBrush) {
      this.canvas.freeDrawingBrush.width = this.brushSize;
      this.canvas.freeDrawingBrush.color = this.color;
      
      if (this.canvas.freeDrawingBrush instanceof PencilBrush) {
        const rgb = this.hexToRgb(this.color);
        if (rgb) {
          this.canvas.freeDrawingBrush.color = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${this.opacity})`;
        }
      }
    }
  }

  setBrushSize(size: number) {
    this.brushSize = size;
    this.updateBrushSettings();
  }

  setOpacity(opacity: number) {
    this.opacity = opacity;
    this.updateBrushSettings();
  }

  setColor(color: string) {
    this.color = color;
    this.updateBrushSettings();
  }

  setZoom(zoom: number) {
    this.canvas.setZoom(zoom);
    this.canvas.renderAll();
  }

  addRectangle() {
    const rect = new Rect({
      left: 100,
      top: 100,
      width: 100,
      height: 80,
      fill: this.color,
      opacity: this.opacity,
      stroke: this.color,
      strokeWidth: 2,
    });
    
    this.canvas.add(rect);
    this.canvas.setActiveObject(rect);
    this.canvas.renderAll();
  }

  addCircle() {
    const circle = new Circle({
      left: 100,
      top: 100,
      radius: 50,
      fill: this.color,
      opacity: this.opacity,
      stroke: this.color,
      strokeWidth: 2,
    });
    
    this.canvas.add(circle);
    this.canvas.setActiveObject(circle);
    this.canvas.renderAll();
  }

  addText(text: string = "Text") {
    const textObj = new IText(text, {
      left: 100,
      top: 100,
      fontFamily: "Arial",
      fontSize: 24,
      fill: this.color,
    });
    
    this.canvas.add(textObj);
    this.canvas.setActiveObject(textObj);
    this.canvas.renderAll();
  }

  fill(_x: number, _y: number) {
    const clickedObject = this.canvas.getActiveObject();
    
    if (clickedObject) {
      clickedObject.set({
        fill: this.color,
        opacity: this.opacity,
      });
      this.canvas.renderAll();
    }
  }

  undo() {
    const objects = this.canvas.getObjects();
    if (objects.length > 0) {
      this.canvas.remove(objects[objects.length - 1]);
      this.canvas.renderAll();
    }
  }

  redo() {
    console.log("Redo functionality not implemented yet");
  }

  clear() {
    this.canvas.clear();
    this.canvas.backgroundColor = "#ffffff";
    this.canvas.renderAll();
  }

  toJSON(): string {
    return JSON.stringify(this.canvas.toJSON());
  }

  toDataURL(format: "png" | "jpeg" | "webp" = "png", quality = 1): string {
    return this.canvas.toDataURL({
      format,
      quality,
      multiplier: 1,
    });
  }

  fromJSON(jsonData: string) {
    try {
      const data = JSON.parse(jsonData);
      this.canvas.loadFromJSON(data).then(() => {
        this.canvas.renderAll();
      });
    } catch (error) {
      console.error("Failed to load canvas from JSON:", error);
    }
  }

  dispose() {
    this.canvas.dispose();
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    } : null;
  }

  applyFilter(_filterName: string, _value: number) {
    console.log("Filter application not implemented for Fabric.js v6");
  }

  bringToFront() {
    const activeObject = this.canvas.getActiveObject();
    if (activeObject) {
      this.canvas.bringObjectToFront(activeObject);
      this.canvas.renderAll();
    }
  }

  sendToBack() {
    const activeObject = this.canvas.getActiveObject();
    if (activeObject) {
      this.canvas.sendObjectToBack(activeObject);
      this.canvas.renderAll();
    }
  }

  bringForward() {
    const activeObject = this.canvas.getActiveObject();
    if (activeObject) {
      this.canvas.bringObjectForward(activeObject);
      this.canvas.renderAll();
    }
  }

  sendBackward() {
    const activeObject = this.canvas.getActiveObject();
    if (activeObject) {
      this.canvas.sendObjectBackwards(activeObject);
      this.canvas.renderAll();
    }
  }
}
