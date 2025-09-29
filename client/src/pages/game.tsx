import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { useWebSocket } from "@/hooks/use-websocket";
import { useGameState } from "@/hooks/use-game-state";
import { useQuery } from "@tanstack/react-query";
import GameHeader from "@/components/game-header";
import DrawingToolbar from "@/components/drawing-toolbar";
import DrawingCanvas from "@/components/drawing-canvas";
import PlayersPanel from "@/components/players-panel";

export default function Game() {
  const [match, params] = useRoute("/game/:roomId");
  const { sendMessage, lastMessage } = useWebSocket();
  const { gameState, updateGameState } = useGameState();
  const [currentTool, setCurrentTool] = useState("brush");
  const [brushSize, setBrushSize] = useState(5);
  const [opacity, setOpacity] = useState(100);
  const [currentColor, setCurrentColor] = useState("#6366F1");

  // Fetch initial room data
  const { data: roomData, isLoading } = useQuery({
    queryKey: ["/api/rooms", params?.roomId],
    enabled: !!params?.roomId,
  });

  // Update game state when room data is fetched
  useEffect(() => {
    if (roomData?.room && !gameState.room) {
      updateGameState(roomData.room);
    }
  }, [roomData, gameState.room, updateGameState]);

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      switch (lastMessage.type) {
        case "game_started":
          updateGameState(lastMessage.data.room);
          break;
        case "prompt_submitted":
          updateGameState(lastMessage.data.room);
          break;
        case "drawing_updated":
          // Handle real-time drawing updates from other players
          break;
        case "phase_changed":
          updateGameState(lastMessage.data.room);
          break;
        case "drawing_submitted":
        case "guess_submitted":
          updateGameState(lastMessage.data.room);
          break;
      }
    }
  }, [lastMessage, updateGameState]);

  const handleDrawingUpdate = (canvasData: string) => {
    if (params?.roomId) {
      sendMessage({
        type: "drawing_update",
        data: {
          roomId: params.roomId,
          canvasData,
        },
      });
    }
  };

  const handleSubmitDrawing = (canvasData: string, imageUrl: string) => {
    if (params?.roomId) {
      sendMessage({
        type: "submit_drawing",
        data: {
          roomId: params.roomId,
          canvasData,
          imageUrl,
        },
      });
    }
  };

  const handleSubmitPrompt = (prompt: string) => {
    if (params?.roomId) {
      sendMessage({
        type: "submit_prompt",
        data: {
          roomId: params.roomId,
          prompt,
        },
      });
    }
  };

  if (!match || !gameState.room) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading game...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      <GameHeader 
        room={gameState.room} 
        currentPlayer={gameState.currentPlayer || undefined}
        timeLeft={gameState.timeLeft}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <DrawingToolbar
          currentTool={currentTool}
          onToolChange={setCurrentTool}
          brushSize={brushSize}
          onBrushSizeChange={setBrushSize}
          opacity={opacity}
          onOpacityChange={setOpacity}
          currentColor={currentColor}
          onColorChange={setCurrentColor}
        />
        
        <main className="flex-1 flex flex-col">
          <DrawingCanvas
            roomId={params.roomId}
            currentTool={currentTool}
            brushSize={brushSize}
            opacity={opacity}
            currentColor={currentColor}
            onDrawingUpdate={handleDrawingUpdate}
            onSubmitDrawing={handleSubmitDrawing}
            onSubmitPrompt={handleSubmitPrompt}
            gamePhase={gameState.room.currentPhase}
            currentPrompt={gameState.currentPrompt}
          />
        </main>
        
        <PlayersPanel
          room={gameState.room}
          currentPlayer={gameState.currentPlayer || undefined}
        />
      </div>
    </div>
  );
}
