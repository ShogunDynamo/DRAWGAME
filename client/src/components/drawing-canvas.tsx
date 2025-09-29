import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FabricCanvas } from "@/lib/fabric-canvas";
import { type GamePhase } from "@shared/schema";

interface DrawingCanvasProps {
  roomId: string;
  currentTool: string;
  brushSize: number;
  opacity: number;
  currentColor: string;
  onDrawingUpdate: (canvasData: string) => void;
  onSubmitDrawing: (canvasData: string, imageUrl: string) => void;
  onSubmitPrompt?: (prompt: string) => void;
  gamePhase: GamePhase;
  currentPrompt?: string;
}

export default function DrawingCanvas({
  roomId,
  currentTool,
  brushSize,
  opacity,
  currentColor,
  onDrawingUpdate,
  onSubmitDrawing,
  onSubmitPrompt,
  gamePhase,
  currentPrompt,
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [guess, setGuess] = useState("");
  const [prompt, setPrompt] = useState("");

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (canvasRef.current && !fabricCanvasRef.current) {
      fabricCanvasRef.current = new FabricCanvas(canvasRef.current, {
        onDrawingUpdate,
      });
    }

    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, [onDrawingUpdate]);

  // Update canvas tool settings
  useEffect(() => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.setTool(currentTool);
      fabricCanvasRef.current.setBrushSize(brushSize);
      fabricCanvasRef.current.setOpacity(opacity / 100);
      fabricCanvasRef.current.setColor(currentColor);
    }
  }, [currentTool, brushSize, opacity, currentColor]);

  const handleZoomIn = () => {
    const newZoom = Math.min(zoom + 25, 200);
    setZoom(newZoom);
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.setZoom(newZoom / 100);
    }
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom - 25, 50);
    setZoom(newZoom);
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.setZoom(newZoom / 100);
    }
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      canvasRef.current?.parentElement?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleSubmitDrawing = () => {
    if (fabricCanvasRef.current) {
      const canvasData = fabricCanvasRef.current.toJSON();
      const imageUrl = fabricCanvasRef.current.toDataURL();
      onSubmitDrawing(JSON.stringify(canvasData), imageUrl);
    }
  };

  const handleSubmitGuess = () => {
    if (guess.trim()) {
      // TODO: Send guess via WebSocket
      console.log("Submitting guess:", guess);
    }
  };

  const handleSubmitPrompt = () => {
    if (prompt.trim() && onSubmitPrompt) {
      onSubmitPrompt(prompt);
      setPrompt(""); // Clear prompt after submission
    }
  };

  if (gamePhase === "writing") {
    return (
      <div className="flex-1 flex flex-col bg-muted/20">
        <div className="bg-card border-b border-border p-6 text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">Write a Prompt</h2>
          <p className="text-muted-foreground">Come up with something creative for others to draw!</p>
        </div>
        
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="w-full max-w-2xl">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-secondary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-pen text-secondary text-2xl" />
                </div>
                <h3 className="text-2xl font-bold text-foreground">Your Turn to Write</h3>
                <p className="text-muted-foreground mt-2">Write something fun, weird, or challenging!</p>
              </div>
              
              <div className="space-y-4">
                <Input
                  data-testid="input-prompt"
                  placeholder="e.g., A cat playing guitar on Mars while wearing a cowboy hat"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="text-lg p-4 bg-input border-border"
                  maxLength={200}
                />
                
                <Button
                  data-testid="button-submit-prompt"
                  onClick={handleSubmitPrompt}
                  disabled={!prompt.trim()}
                  className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground py-3 text-lg"
                >
                  <i className="fas fa-check mr-2" />
                  Submit Prompt
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (gamePhase === "guessing") {
    return (
      <div className="flex-1 flex flex-col bg-muted/20">
        <div className="bg-card border-b border-border p-6 text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">What is this drawing?</h2>
          <p className="text-muted-foreground">Look at the drawing and guess what it represents</p>
        </div>
        
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="grid lg:grid-cols-2 gap-8 w-full max-w-6xl">
            {/* Drawing Display */}
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <div className="bg-white rounded-xl p-4 min-h-96 flex items-center justify-center">
                  <span className="text-muted-foreground italic">Drawing will appear here</span>
                </div>
              </CardContent>
            </Card>
            
            {/* Guess Input */}
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-lightbulb text-accent text-2xl" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">Your Guess</h3>
                  <p className="text-muted-foreground mt-2">What do you think this drawing shows?</p>
                </div>
                
                <div className="space-y-4">
                  <Input
                    data-testid="input-guess"
                    placeholder="Enter your guess..."
                    value={guess}
                    onChange={(e) => setGuess(e.target.value)}
                    className="text-lg p-4 bg-input border-border"
                    maxLength={200}
                  />
                  
                  <Button
                    data-testid="button-submit-guess"
                    onClick={handleSubmitGuess}
                    disabled={!guess.trim()}
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground py-3 text-lg"
                  >
                    <i className="fas fa-check mr-2" />
                    Submit Guess
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Drawing phase
  return (
    <div className="flex-1 flex flex-col bg-muted/20">
      {/* Prompt Display */}
      <div className="bg-card border-b border-border p-6 text-center">
        <h2 className="text-xl font-bold text-foreground mb-2">Draw this prompt:</h2>
        <p className="text-2xl font-bold text-secondary bg-secondary/10 px-6 py-3 rounded-xl inline-block">
          "{currentPrompt || 'A cat playing guitar on Mars while wearing a cowboy hat'}"
        </p>
      </div>
      
      {/* Canvas Container */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="relative">
          <canvas
            ref={canvasRef}
            data-testid="drawing-canvas"
            className="drawing-canvas rounded-2xl shadow-2xl border-4 gradient-border"
            width={900}
            height={600}
          />
        </div>
      </div>
      
      {/* Canvas Controls */}
      <div className="bg-card border-t border-border p-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <Button
              data-testid="button-fullscreen"
              onClick={handleFullscreen}
              variant="outline"
              size="sm"
            >
              <i className="fas fa-expand mr-2" />
              Fullscreen
            </Button>
            
            <Button
              data-testid="button-zoom-in"
              onClick={handleZoomIn}
              variant="outline"
              size="sm"
              disabled={zoom >= 200}
            >
              <i className="fas fa-search-plus mr-2" />
              Zoom In
            </Button>
            
            <Button
              data-testid="button-zoom-out"
              onClick={handleZoomOut}
              variant="outline"
              size="sm"
              disabled={zoom <= 50}
            >
              <i className="fas fa-search-minus mr-2" />
              Zoom Out
            </Button>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <span>Canvas: 900x600px</span>
              <span>|</span>
              <span>Zoom: {zoom}%</span>
            </div>
            
            <Button
              data-testid="button-submit-drawing"
              onClick={handleSubmitDrawing}
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
            >
              <i className="fas fa-check mr-2" />
              Done Drawing
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
