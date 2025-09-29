import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ColorPicker from "./color-picker";
import LayerPanel from "./layer-panel";
import FilterPanel from "./filter-panel";

interface DrawingToolbarProps {
  currentTool: string;
  onToolChange: (tool: string) => void;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  opacity: number;
  onOpacityChange: (opacity: number) => void;
  currentColor: string;
  onColorChange: (color: string) => void;
}

const tools = [
  { id: "brush", icon: "fas fa-paintbrush", title: "Brush" },
  { id: "pencil", icon: "fas fa-pencil-alt", title: "Pencil" },
  { id: "eraser", icon: "fas fa-eraser", title: "Eraser" },
  { id: "fill", icon: "fas fa-fill-drip", title: "Fill Bucket" },
  { id: "rectangle", icon: "fas fa-square", title: "Rectangle" },
  { id: "circle", icon: "fas fa-circle", title: "Circle" },
  { id: "text", icon: "fas fa-font", title: "Text" },
  { id: "eyedropper", icon: "fas fa-eye-dropper", title: "Eyedropper" },
];

export default function DrawingToolbar({
  currentTool,
  onToolChange,
  brushSize,
  onBrushSizeChange,
  opacity,
  onOpacityChange,
  currentColor,
  onColorChange,
}: DrawingToolbarProps) {
  const [activeTab, setActiveTab] = useState("draw");

  return (
    <aside className="w-80 bg-card border-r border-border flex flex-col shadow-xl">
      <div className="p-4 border-b border-border">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 bg-muted">
            <TabsTrigger value="draw" data-testid="tab-draw">
              <i className="fas fa-paint-brush mr-2" />
              Draw
            </TabsTrigger>
            <TabsTrigger value="layers" data-testid="tab-layers">
              <i className="fas fa-layer-group mr-2" />
              Layers
            </TabsTrigger>
            <TabsTrigger value="filters" data-testid="tab-filters">
              <i className="fas fa-filter mr-2" />
              Filters
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="draw" className="mt-4 space-y-6">
            {/* Drawing Tools */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Tools</h4>
              <div className="grid grid-cols-4 gap-2">
                {tools.map((tool) => (
                  <Button
                    key={tool.id}
                    data-testid={`tool-${tool.id}`}
                    onClick={() => onToolChange(tool.id)}
                    variant={currentTool === tool.id ? "default" : "outline"}
                    size="sm"
                    className={`h-12 ${currentTool === tool.id ? "bg-primary text-primary-foreground" : ""}`}
                    title={tool.title}
                  >
                    <i className={tool.icon} />
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Brush Settings */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Brush Size: {brushSize}px
                </label>
                <Slider
                  data-testid="slider-brush-size"
                  value={[brushSize]}
                  onValueChange={(value) => onBrushSizeChange(value[0])}
                  max={50}
                  min={1}
                  step={1}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Opacity: {opacity}%
                </label>
                <Slider
                  data-testid="slider-opacity"
                  value={[opacity]}
                  onValueChange={(value) => onOpacityChange(value[0])}
                  max={100}
                  min={0}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>
            
            {/* Color Picker */}
            <ColorPicker
              currentColor={currentColor}
              onColorChange={onColorChange}
            />
          </TabsContent>
          
          <TabsContent value="layers" className="mt-4">
            <LayerPanel />
          </TabsContent>
          
          <TabsContent value="filters" className="mt-4">
            <FilterPanel />
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Action Buttons */}
      <div className="p-4 mt-auto">
        <div className="flex gap-2 mb-4">
          <Button
            data-testid="button-undo"
            variant="outline"
            size="sm"
            className="flex-1"
            title="Undo"
          >
            <i className="fas fa-undo" />
          </Button>
          <Button
            data-testid="button-redo"
            variant="outline"
            size="sm"
            className="flex-1"
            title="Redo"
          >
            <i className="fas fa-redo" />
          </Button>
          <Button
            data-testid="button-clear"
            variant="outline"
            size="sm"
            className="flex-1"
            title="Clear Canvas"
          >
            <i className="fas fa-trash" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
