import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type Room, type Player } from "@shared/schema";

interface GameHeaderProps {
  room: Room;
  currentPlayer?: Player;
  timeLeft?: number;
}

export default function GameHeader({ room, currentPlayer, timeLeft = 165 }: GameHeaderProps) {
  const [, setLocation] = useLocation();
  const [displayTime, setDisplayTime] = useState(timeLeft);

  useEffect(() => {
    setDisplayTime(timeLeft);
  }, [timeLeft]);

  useEffect(() => {
    const timer = setInterval(() => {
      setDisplayTime(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getPhaseDisplayName = (phase: string) => {
    switch (phase) {
      case "writing":
        return "Writing Phase";
      case "drawing":
        return "Drawing Phase";
      case "guessing":
        return "Guessing Phase";
      case "results":
        return "Results";
      default:
        return "Game Phase";
    }
  };

  const handleLeaveGame = () => {
    setLocation("/");
  };

  return (
    <header className="bg-card border-b border-border p-4 shadow-lg">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
              <i className="fas fa-palette text-xl text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary">DrawTelephone</h1>
              <p className="text-sm text-muted-foreground" data-testid="text-room-code">
                Room: {room.code}
              </p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-2 bg-muted rounded-lg px-3 py-1">
            <i className="fas fa-users text-accent text-sm" />
            <span className="text-sm font-medium" data-testid="text-player-count">
              {room.players.length}/{room.maxPlayers} Players
            </span>
          </div>

          <Badge 
            variant="secondary" 
            className="hidden md:inline-flex bg-primary/20 text-primary border-primary/30"
          >
            {room.gameMode.charAt(0).toUpperCase() + room.gameMode.slice(1)} Mode
          </Badge>
        </div>
        
        {/* Timer and Status */}
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div 
              className={`text-3xl font-bold transition-colors ${
                displayTime <= 30 ? "text-destructive timer-pulse" : "text-secondary"
              }`}
              data-testid="text-timer"
            >
              {formatTime(displayTime)}
            </div>
            <div className="text-sm text-muted-foreground">Time Left</div>
          </div>
          
          <div className="flex flex-col items-end">
            <div className="text-lg font-semibold text-accent" data-testid="text-current-phase">
              {getPhaseDisplayName(room.currentPhase)}
            </div>
            <div className="text-sm text-muted-foreground">
              Round {room.currentRound} of {room.totalRounds}
            </div>
          </div>
          
          <Button
            data-testid="button-leave-game"
            onClick={handleLeaveGame}
            variant="destructive"
            size="sm"
          >
            <i className="fas fa-sign-out-alt mr-2" />
            Leave Game
          </Button>
        </div>
      </div>
    </header>
  );
}
