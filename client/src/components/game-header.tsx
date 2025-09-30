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

  const waitingPlayers = room.players.filter(p => p.status === "waiting");
  const finishedPlayers = room.players.filter(p => p.status === "finished");

  return (
    <header className="bg-card border-b border-border shadow-lg">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-md">
                <i className="fas fa-palette text-xl text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">DrawTelephone</h1>
                <p className="text-sm text-muted-foreground" data-testid="text-room-code">
                  Room: <span className="font-semibold">{room.code}</span>
                </p>
              </div>
            </div>
            
            <div className="hidden md:flex items-center gap-2 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg px-3 py-1.5 border border-primary/20">
              <i className="fas fa-users text-accent text-sm" />
              <span className="text-sm font-medium" data-testid="text-player-count">
                {room.players.length}/{room.maxPlayers} Players
              </span>
            </div>

            <Badge 
              variant="secondary" 
              className="hidden md:inline-flex bg-gradient-to-r from-primary/20 to-accent/20 text-primary border-primary/30 shadow-sm"
            >
              {room.gameMode.charAt(0).toUpperCase() + room.gameMode.slice(1)} Mode
            </Badge>
          </div>
        
          {/* Timer and Status */}
          <div className="flex items-center gap-6">
            <div className="text-center bg-gradient-to-br from-secondary/20 to-accent/20 rounded-lg px-4 py-2 border border-secondary/30">
              <div 
                className={`text-3xl font-bold transition-colors ${
                  displayTime <= 30 ? "text-destructive timer-pulse" : "text-secondary"
                }`}
                data-testid="text-timer"
              >
                {formatTime(displayTime)}
              </div>
              <div className="text-xs text-muted-foreground font-medium">Time Left</div>
            </div>
            
            <div className="flex flex-col items-end">
              <div className="text-lg font-semibold text-accent" data-testid="text-current-phase">
                {getPhaseDisplayName(room.currentPhase)}
              </div>
              <div className="text-sm text-muted-foreground">
                Round <span className="font-semibold">{room.currentRound}</span> of {room.totalRounds}
              </div>
            </div>
            
            <Button
              data-testid="button-leave-game"
              onClick={handleLeaveGame}
              variant="destructive"
              size="sm"
              className="shadow-md"
            >
              <i className="fas fa-sign-out-alt mr-2" />
              Leave Game
            </Button>
          </div>
        </div>
      </div>

      {/* Waiting Indicator - Only show during active game phases */}
      {room.currentPhase !== "lobby" && room.currentPhase !== "results" && waitingPlayers.length > 0 && (
        <div className="px-4 py-2 bg-muted/50 border-t border-border/50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-muted-foreground">
                  Waiting for {waitingPlayers.length} {waitingPlayers.length === 1 ? 'player' : 'players'}:
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {waitingPlayers.map(player => (
                  <Badge 
                    key={player.id} 
                    variant="outline"
                    className="bg-background/50 text-xs"
                    data-testid={`waiting-player-${player.id}`}
                  >
                    {player.name}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              <i className="fas fa-check-circle text-green-500 mr-1" />
              {finishedPlayers.length} finished
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
