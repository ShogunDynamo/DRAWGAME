import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { type Room, type Player } from "@shared/schema";

interface PlayersPanelProps {
  room: Room;
  currentPlayer?: Player;
}

export default function PlayersPanel({ room, currentPlayer }: PlayersPanelProps) {
  const gameProgress = (room.currentRound / room.totalRounds) * 100;
  const onlinePlayers = room.players.filter(p => p.status !== "disconnected");

  const getPlayerStatusColor = (player: Player) => {
    switch (player.status) {
      case "active":
        return "text-primary";
      case "finished":
        return "text-green-400";
      case "waiting":
        return "text-yellow-400";
      case "disconnected":
        return "text-red-400";
      default:
        return "text-muted-foreground";
    }
  };

  const getPlayerStatusIcon = (player: Player) => {
    switch (player.status) {
      case "active":
        return "fas fa-paintbrush";
      case "finished":
        return "fas fa-check";
      case "waiting":
        return "fas fa-clock";
      case "disconnected":
        return "fas fa-wifi-slash";
      default:
        return "fas fa-user";
    }
  };

  const getPlayerStatusText = (player: Player) => {
    switch (player.status) {
      case "active":
        return room.currentPhase === "drawing" ? "Drawing..." : "Guessing...";
      case "finished":
        return "Finished";
      case "waiting":
        return "Waiting...";
      case "disconnected":
        return "Disconnected";
      default:
        return "Unknown";
    }
  };

  return (
    <aside className="w-80 bg-card border-l border-border flex flex-col shadow-xl">
      {/* Players Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-foreground">Players</h3>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-sm text-muted-foreground">{onlinePlayers.length} Online</span>
          </div>
        </div>
        
        {/* Game Mode Info */}
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-primary capitalize">{room.gameMode} Mode</span>
            <i className="fas fa-info-circle text-primary" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {room.gameMode === "normal" && "Draw → Guess → Reveal cycle"}
            {room.gameMode === "secret" && "Hidden prompts mode"}
            {room.gameMode === "score" && "Competitive points"}
            {room.gameMode === "masterpiece" && "Extended time limit"}
          </p>
        </div>
      </div>
      
      {/* Players List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-3">
          {room.players.map((player) => (
            <div
              key={player.id}
              data-testid={`player-${player.id}`}
              className={`rounded-xl p-3 transition-all ${
                player.status === "active" 
                  ? "bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 player-avatar active"
                  : "bg-muted/30 border border-muted player-avatar"
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white font-bold">
                  {player.name.charAt(0).toUpperCase()}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{player.name}</span>
                    {player.isHost && (
                      <Badge variant="outline" className="text-xs border-accent text-accent">
                        <i className="fas fa-crown mr-1" />
                        Host
                      </Badge>
                    )}
                    {player.id === currentPlayer?.id && (
                      <Badge variant="secondary" className="text-xs">You</Badge>
                    )}
                    <div 
                      className={`w-2 h-2 rounded-full ${
                        player.status === "disconnected" ? "bg-red-500" : "bg-green-500"
                      }`} 
                    />
                  </div>
                  <div className={`flex items-center gap-1 text-sm ${getPlayerStatusColor(player)}`}>
                    <i className={`${getPlayerStatusIcon(player)} text-xs`} />
                    <span>{getPlayerStatusText(player)}</span>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm font-bold text-secondary">{player.score}</div>
                  <div className="text-xs text-muted-foreground">points</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Game Progress */}
      <div className="p-4 border-t border-border">
        <div className="bg-muted/30 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Game Progress</span>
            <span className="text-sm text-muted-foreground">{Math.round(gameProgress)}%</span>
          </div>
          <Progress value={gameProgress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>Round {room.currentRound} of {room.totalRounds}</span>
            <span className="capitalize">{room.currentPhase} phase</span>
          </div>
        </div>
        
        {/* Host Controls */}
        {currentPlayer?.isHost && (
          <div className="space-y-2">
            <Button
              data-testid="button-game-settings"
              variant="outline"
              className="w-full text-secondary border-secondary/30 hover:bg-secondary/10"
            >
              <i className="fas fa-cog mr-2" />
              Game Settings
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
