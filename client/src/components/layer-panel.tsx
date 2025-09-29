import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  blendMode: string;
  locked: boolean;
}

const blendModes = [
  "normal", "multiply", "screen", "overlay", "soft-light", 
  "hard-light", "color-dodge", "color-burn", "darken", "lighten"
];

export default function LayerPanel() {
  const [layers, setLayers] = useState<Layer[]>([
    {
      id: "layer-1",
      name: "Background",
      visible: true,
      opacity: 100,
      blendMode: "normal",
      locked: true,
    },
    {
      id: "layer-2", 
      name: "Layer 1",
      visible: true,
      opacity: 100,
      blendMode: "normal",
      locked: false,
    }
  ]);

  const [selectedLayer, setSelectedLayer] = useState("layer-2");

  const addLayer = () => {
    const newLayer: Layer = {
      id: `layer-${Date.now()}`,
      name: `Layer ${layers.length}`,
      visible: true,
      opacity: 100,
      blendMode: "normal",
      locked: false,
    };
    setLayers([...layers, newLayer]);
    setSelectedLayer(newLayer.id);
  };

  const deleteLayer = (layerId: string) => {
    if (layers.length <= 1) return; // Don't delete if only one layer
    const filteredLayers = layers.filter(l => l.id !== layerId);
    setLayers(filteredLayers);
    if (selectedLayer === layerId) {
      setSelectedLayer(filteredLayers[filteredLayers.length - 1]?.id || "");
    }
  };

  const toggleLayerVisibility = (layerId: string) => {
    setLayers(layers.map(layer => 
      layer.id === layerId 
        ? { ...layer, visible: !layer.visible }
        : layer
    ));
  };

  const toggleLayerLock = (layerId: string) => {
    setLayers(layers.map(layer => 
      layer.id === layerId 
        ? { ...layer, locked: !layer.locked }
        : layer
    ));
  };

  const updateLayerOpacity = (layerId: string, opacity: number) => {
    setLayers(layers.map(layer => 
      layer.id === layerId 
        ? { ...layer, opacity }
        : layer
    ));
  };

  const updateLayerBlendMode = (layerId: string, blendMode: string) => {
    setLayers(layers.map(layer => 
      layer.id === layerId 
        ? { ...layer, blendMode }
        : layer
    ));
  };

  const updateLayerName = (layerId: string, name: string) => {
    setLayers(layers.map(layer => 
      layer.id === layerId 
        ? { ...layer, name }
        : layer
    ));
  };

  const moveLayer = (layerId: string, direction: "up" | "down") => {
    const currentIndex = layers.findIndex(l => l.id === layerId);
    if (currentIndex === -1) return;

    const newIndex = direction === "up" ? currentIndex + 1 : currentIndex - 1;
    if (newIndex < 0 || newIndex >= layers.length) return;

    const newLayers = [...layers];
    [newLayers[currentIndex], newLayers[newIndex]] = [newLayers[newIndex], newLayers[currentIndex]];
    setLayers(newLayers);
  };

  const selectedLayerData = layers.find(l => l.id === selectedLayer);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Layers</h4>
        <Button
          data-testid="button-add-layer"
          onClick={addLayer}
          size="sm"
          className="h-7 w-7 p-0"
        >
          <i className="fas fa-plus text-xs" />
        </Button>
      </div>

      {/* Layer List */}
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {[...layers].reverse().map((layer) => (
          <div
            key={layer.id}
            data-testid={`layer-${layer.id}`}
            className={`p-2 rounded-lg border cursor-pointer transition-colors ${
              selectedLayer === layer.id
                ? "bg-primary/20 border-primary/30"
                : "bg-muted/30 border-muted hover:bg-muted/50"
            }`}
            onClick={() => setSelectedLayer(layer.id)}
          >
            <div className="flex items-center gap-2">
              <Button
                data-testid={`button-layer-visibility-${layer.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLayerVisibility(layer.id);
                }}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                <i className={`fas ${layer.visible ? "fa-eye" : "fa-eye-slash"} text-xs`} />
              </Button>

              <Input
                data-testid={`input-layer-name-${layer.id}`}
                value={layer.name}
                onChange={(e) => updateLayerName(layer.id, e.target.value)}
                className="flex-1 h-6 text-xs bg-transparent border-0 p-1"
                onClick={(e) => e.stopPropagation()}
              />

              <Button
                data-testid={`button-layer-lock-${layer.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLayerLock(layer.id);
                }}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                disabled={layer.id === "layer-1"} // Background layer is always locked
              >
                <i className={`fas ${layer.locked ? "fa-lock" : "fa-unlock"} text-xs`} />
              </Button>

              {layer.id !== "layer-1" && (
                <Button
                  data-testid={`button-delete-layer-${layer.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteLayer(layer.id);
                  }}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-destructive hover:bg-destructive/20"
                >
                  <i className="fas fa-trash text-xs" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Layer Controls */}
      {selectedLayerData && (
        <div className="space-y-3 pt-3 border-t border-border">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">
              Opacity: {selectedLayerData.opacity}%
            </label>
            <Slider
              data-testid="slider-layer-opacity"
              value={[selectedLayerData.opacity]}
              onValueChange={(value) => updateLayerOpacity(selectedLayer, value[0])}
              max={100}
              min={0}
              step={1}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">
              Blend Mode
            </label>
            <Select
              value={selectedLayerData.blendMode}
              onValueChange={(value) => updateLayerBlendMode(selectedLayer, value)}
            >
              <SelectTrigger data-testid="select-blend-mode" className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {blendModes.map((mode) => (
                  <SelectItem key={mode} value={mode} className="text-xs">
                    {mode.charAt(0).toUpperCase() + mode.slice(1).replace("-", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-1">
            <Button
              data-testid="button-move-layer-up"
              onClick={() => moveLayer(selectedLayer, "up")}
              variant="outline"
              size="sm"
              className="flex-1 h-7 text-xs"
              disabled={layers.findIndex(l => l.id === selectedLayer) === layers.length - 1}
            >
              <i className="fas fa-arrow-up text-xs" />
            </Button>
            <Button
              data-testid="button-move-layer-down"
              onClick={() => moveLayer(selectedLayer, "down")}
              variant="outline"
              size="sm"
              className="flex-1 h-7 text-xs"
              disabled={layers.findIndex(l => l.id === selectedLayer) === 0}
            >
              <i className="fas fa-arrow-down text-xs" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
