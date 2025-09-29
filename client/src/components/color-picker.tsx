import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface ColorPickerProps {
  currentColor: string;
  onColorChange: (color: string) => void;
}

const colorPalette = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280",
  "#f87171", "#fb923c", "#fde047", "#4ade80",
  "#60a5fa", "#a78bfa", "#f472b6", "#9ca3af",
];

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h: number, s: number, l: number): string {
  h /= 360;
  s /= 100;
  l /= 100;

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  const toHex = (c: number) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export default function ColorPicker({ currentColor, onColorChange }: ColorPickerProps) {
  const [hexInput, setHexInput] = useState(currentColor);
  const [hsl, setHsl] = useState<[number, number, number]>([262, 83, 58]);
  const [colorHistory, setColorHistory] = useState<string[]>([]);

  useEffect(() => {
    setHexInput(currentColor);
    setHsl(hexToHsl(currentColor));
  }, [currentColor]);

  const handleHexChange = (value: string) => {
    setHexInput(value);
    if (/^#[0-9A-F]{6}$/i.test(value)) {
      onColorChange(value);
      addToHistory(value);
    }
  };

  const handleHslChange = (component: 'h' | 's' | 'l', value: number) => {
    const newHsl: [number, number, number] = [...hsl];
    const index = component === 'h' ? 0 : component === 's' ? 1 : 2;
    newHsl[index] = value;
    setHsl(newHsl);
    
    const hexColor = hslToHex(newHsl[0], newHsl[1], newHsl[2]);
    setHexInput(hexColor);
    onColorChange(hexColor);
    addToHistory(hexColor);
  };

  const addToHistory = (color: string) => {
    setColorHistory(prev => {
      const filtered = prev.filter(c => c !== color);
      return [color, ...filtered].slice(0, 8);
    });
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-foreground">Colors</h4>
      
      {/* Current Color & Hex Input */}
      <div className="flex gap-3 items-center">
        <div 
          className="w-12 h-12 rounded-lg border-2 border-background shadow-md"
          style={{ backgroundColor: currentColor }}
          data-testid="current-color-display"
        />
        <Input
          data-testid="input-hex-color"
          value={hexInput}
          onChange={(e) => handleHexChange(e.target.value.toUpperCase())}
          placeholder="#6366F1"
          className="flex-1 font-mono text-sm"
          maxLength={7}
        />
      </div>
      
      {/* Color Palette */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-2">Palette</label>
        <div className="grid grid-cols-8 gap-1">
          {colorPalette.map((color, index) => (
            <Button
              key={index}
              data-testid={`palette-color-${index}`}
              onClick={() => {
                onColorChange(color);
                addToHistory(color);
              }}
              className="w-6 h-6 p-0 rounded border-0 hover:scale-110 transition-transform"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* Color History */}
      {colorHistory.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-2">Recent</label>
          <div className="flex gap-1 flex-wrap">
            {colorHistory.map((color, index) => (
              <Button
                key={index}
                data-testid={`history-color-${index}`}
                onClick={() => onColorChange(color)}
                className="w-6 h-6 p-0 rounded border-0 hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* HSL Controls */}
      <div className="space-y-3">
        <label className="block text-xs font-medium text-muted-foreground">HSL</label>
        
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <label className="text-xs text-muted-foreground w-4">H</label>
            <Slider
              data-testid="slider-hue"
              value={[hsl[0]]}
              onValueChange={(value) => handleHslChange('h', value[0])}
              max={360}
              min={0}
              step={1}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-8">{hsl[0]}</span>
          </div>
          
          <div className="flex items-center gap-3">
            <label className="text-xs text-muted-foreground w-4">S</label>
            <Slider
              data-testid="slider-saturation"
              value={[hsl[1]]}
              onValueChange={(value) => handleHslChange('s', value[0])}
              max={100}
              min={0}
              step={1}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-8">{hsl[1]}</span>
          </div>
          
          <div className="flex items-center gap-3">
            <label className="text-xs text-muted-foreground w-4">L</label>
            <Slider
              data-testid="slider-lightness"
              value={[hsl[2]]}
              onValueChange={(value) => handleHslChange('l', value[0])}
              max={100}
              min={0}
              step={1}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-8">{hsl[2]}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
