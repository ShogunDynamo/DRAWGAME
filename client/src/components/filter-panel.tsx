import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FilterSettings {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  sharpen: number;
  sepia: number;
  grayscale: number;
  vintage: number;
  pixelate: number;
}

const filterCategories = {
  "Basic": ["brightness", "contrast", "saturation"],
  "Effects": ["blur", "sharpen", "sepia", "grayscale"],
  "Artistic": ["vintage", "pixelate"]
};

export default function FilterPanel() {
  const [filters, setFilters] = useState<FilterSettings>({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    blur: 0,
    sharpen: 0,
    sepia: 0,
    grayscale: 0,
    vintage: 0,
    pixelate: 0,
  });

  const [selectedCategory, setSelectedCategory] = useState("Basic");
  const [previewEnabled, setPreviewEnabled] = useState(true);

  const updateFilter = (filterName: keyof FilterSettings, value: number) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      brightness: 0,
      contrast: 0,
      saturation: 0,
      blur: 0,
      sharpen: 0,
      sepia: 0,
      grayscale: 0,
      vintage: 0,
      pixelate: 0,
    });
  };

  const applyFilters = () => {
    // TODO: Apply filters to the canvas
    console.log("Applying filters:", filters);
  };

  const getFilterRange = (filterName: string) => {
    switch (filterName) {
      case "brightness":
      case "contrast":
      case "saturation":
        return { min: -100, max: 100, step: 1 };
      case "blur":
        return { min: 0, max: 20, step: 0.1 };
      case "sharpen":
        return { min: 0, max: 10, step: 0.1 };
      case "sepia":
      case "grayscale":
      case "vintage":
        return { min: 0, max: 100, step: 1 };
      case "pixelate":
        return { min: 0, max: 50, step: 1 };
      default:
        return { min: 0, max: 100, step: 1 };
    }
  };

  const getFilterDisplayName = (filterName: string) => {
    return filterName.charAt(0).toUpperCase() + filterName.slice(1);
  };

  const getFilterValue = (filterName: keyof FilterSettings) => {
    const value = filters[filterName];
    const range = getFilterRange(filterName);
    
    if (filterName === "blur" || filterName === "sharpen") {
      return `${value.toFixed(1)}px`;
    }
    if (range.min < 0) {
      return value > 0 ? `+${value}` : `${value}`;
    }
    return `${value}${filterName.includes("pixelate") ? "px" : "%"}`;
  };

  const quickPresets = [
    { name: "B&W", filters: { grayscale: 100 } },
    { name: "Vintage", filters: { sepia: 60, vintage: 40, contrast: 20 } },
    { name: "High Contrast", filters: { contrast: 50, saturation: 30 } },
    { name: "Soft", filters: { blur: 2, brightness: 10 } },
    { name: "Sharp", filters: { sharpen: 3, contrast: 25 } },
  ];

  const applyPreset = (preset: typeof quickPresets[0]) => {
    setFilters(prev => ({
      ...prev,
      ...preset.filters
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Filters & Effects</h4>
        <Button
          data-testid="button-toggle-preview"
          onClick={() => setPreviewEnabled(!previewEnabled)}
          variant={previewEnabled ? "default" : "outline"}
          size="sm"
          className="h-7 text-xs"
        >
          <i className="fas fa-eye mr-1" />
          Preview
        </Button>
      </div>

      {/* Quick Presets */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-2">Quick Presets</label>
        <div className="grid grid-cols-2 gap-1">
          {quickPresets.map((preset) => (
            <Button
              key={preset.name}
              data-testid={`button-preset-${preset.name.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => applyPreset(preset)}
              variant="outline"
              size="sm"
              className="h-7 text-xs"
            >
              {preset.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Category Selection */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-2">Category</label>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger data-testid="select-filter-category" className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(filterCategories).map((category) => (
              <SelectItem key={category} value={category} className="text-xs">
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filter Controls */}
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {filterCategories[selectedCategory as keyof typeof filterCategories].map((filterName) => {
          const range = getFilterRange(filterName);
          const filterKey = filterName as keyof FilterSettings;
          
          return (
            <div key={filterName}>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-foreground">
                  {getFilterDisplayName(filterName)}
                </label>
                <span className="text-xs text-muted-foreground">
                  {getFilterValue(filterKey)}
                </span>
              </div>
              <Slider
                data-testid={`slider-filter-${filterName}`}
                value={[filters[filterKey]]}
                onValueChange={(value) => updateFilter(filterKey, value[0])}
                min={range.min}
                max={range.max}
                step={range.step}
                className="w-full"
              />
            </div>
          );
        })}
      </div>

      {/* Advanced Filters Info */}
      <div className="bg-accent/10 border border-accent/20 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <i className="fas fa-info-circle text-accent text-xs" />
          <span className="text-xs font-medium text-accent">Pro Tip</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Combine multiple filters for unique effects. Use preview to see changes in real-time.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2 border-t border-border">
        <Button
          data-testid="button-reset-filters"
          onClick={resetFilters}
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-xs"
        >
          <i className="fas fa-undo mr-1" />
          Reset
        </Button>
        <Button
          data-testid="button-apply-filters"
          onClick={applyFilters}
          className="flex-1 h-8 text-xs bg-accent hover:bg-accent/90"
        >
          <i className="fas fa-check mr-1" />
          Apply
        </Button>
      </div>
    </div>
  );
}
