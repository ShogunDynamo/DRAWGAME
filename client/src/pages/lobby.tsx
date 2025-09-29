import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { type Room } from "@shared/schema";

export default function Lobby() {
  const [match, params] = useRoute("/lobby/:code");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [playerName, setPlayerName] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);

  // Get URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hostParam = urlParams.get("host");
    const playerParam = urlParams.get("player");
    
    if (hostParam) {
      setPlayerName(hostParam);
      setIsHost(true);
    } else if (playerParam) {
      setPlayerName(playerParam);
      setIsHost(false);
    }
  }, []);

  // Fetch room data
  const { data: roomData, isLoading } = useQuery({
    queryKey: ["/api/rooms", params?.code],
    enabled: !!params?.code,
  });

  // WebSocket connection
  const { sendMessage, lastMessage, connectionStatus } = useWebSocket();

  // Join room when WebSocket connects and we have player name
  useEffect(() => {
    if (connectionStatus === "connected" && playerName && params?.code && !room) {
      sendMessage({
        type: "join_room",
        data: {
          roomCode: params.code,
          playerName,
        },
      });
    }
  }, [connectionStatus, playerName, params?.code, room, sendMessage]);

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      switch (lastMessage.type) {
        case "room_joined":
          setRoom(lastMessage.data.room);
          toast({
            title: "Joined Room",
            description: `Welcome to room ${lastMessage.data.room.code}!`,
          });
          break;
        case "player_joined":
          setRoom(lastMessage.data.room);
          toast({
            title: "Player Joined",
            description: `${lastMessage.data.player.name} joined the room`,
          });
          break;
        case "player_left":
          setRoom(lastMessage.data.room);
          break;
        case "game_started":
          setLocation(`/game/${lastMessage.data.room.id}`);
          break;
        case "error":
          toast({
            title: "Error",
            description: lastMessage.message,
            variant: "destructive",
          });
          break;
      }
    }
  }, [lastMessage, toast, setLocation]);

  const handleStartGame = () => {
    if (room && isHost) {
      sendMessage({
        type: "start_game",
        data: { roomId: room.id },
      });
    }
  };

  const handleLeaveRoom = () => {
    if (room) {
      sendMessage({
        type: "leave_room",
        data: { roomId: room.id },
      });
    }
    setLocation("/");
  };

  if (!match) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading room...</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <div className="w-12 h-12 bg-destructive/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-exclamation-triangle text-destructive text-xl" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Connection Issue</h2>
            <p className="text-muted-foreground mb-6">
              {connectionStatus === "connecting" ? "Connecting to room..." : "Failed to connect to room"}
            </p>
            <Button onClick={() => setLocation("/")} variant="outline">
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canStartGame = room.players.length >= 4 && isHost;
  const gameMode = room.gameMode.charAt(0).toUpperCase() + room.gameMode.slice(1);

  return (
    <div className="min-h-screen bg-background text-foreground p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
              <i className="fas fa-palette text-xl text-white" />
            </div>
            <h1 className="text-3xl font-bold text-primary">DrawTelephone</h1>
          </div>
          
          <div className="bg-card border border-border rounded-xl p-4 inline-block">
            <div className="text-3xl font-bold text-secondary mb-1" data-testid="text-room-code">{room.code}</div>
            <div className="text-sm text-muted-foreground">Room Code</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Game Settings */}
          <div className="lg:col-span-1">
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-foreground mb-4">Game Settings</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Mode</span>
                    <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                      {gameMode}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Players</span>
                    <span className="font-medium text-foreground">
                      {room.players.length}/{room.maxPlayers}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Drawing Time</span>
                    <span className="font-medium text-foreground">{room.drawingTime}s</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Guessing Time</span>
                    <span className="font-medium text-foreground">{room.guessingTime}s</span>
                  </div>
                </div>

                {isHost && (
                  <div className="mt-6 pt-4 border-t border-border">
                    <div className="flex items-center gap-2 text-sm text-accent mb-3">
                      <i className="fas fa-crown" />
                      <span className="font-medium">You are the host</span>
                    </div>
                    
                    <div className="space-y-2">
                      <Button
                        data-testid="button-start-game"
                        onClick={handleStartGame}
                        disabled={!canStartGame}
                        className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                      >
                        <i className="fas fa-play mr-2" />
                        Start Game
                      </Button>
                      
                      {!canStartGame && (
                        <p className="text-xs text-muted-foreground text-center">
                          Need at least 4 players to start
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Players List */}
          <div className="lg:col-span-2">
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-foreground">Players</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-sm text-muted-foreground">{room.players.length} Online</span>
                  </div>
                </div>

                <div className="grid gap-3">
                  {room.players.map((player) => (
                    <div
                      key={player.id}
                      data-testid={`player-${player.id}`}
                      className={`bg-muted/30 border border-muted rounded-xl p-4 transition-all ${
                        player.isHost ? "bg-gradient-to-r from-primary/20 to-accent/20 border-primary/30" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
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
                          </div>
                          <div className="flex items-center gap-1 text-sm">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            <span className="text-green-400">Online</span>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-sm font-bold text-secondary">{player.score}</div>
                          <div className="text-xs text-muted-foreground">points</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Empty player slots */}
                  {Array.from({ length: Math.max(0, room.maxPlayers - room.players.length) }).map((_, index) => (
                    <div key={`empty-${index}`} className="bg-muted/10 border border-dashed border-muted rounded-xl p-4">
                      <div className="flex items-center gap-3 opacity-50">
                        <div className="w-10 h-10 bg-muted/30 rounded-full flex items-center justify-center">
                          <i className="fas fa-user-plus text-muted-foreground" />
                        </div>
                        <span className="text-muted-foreground italic">Waiting for player...</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="mt-8 flex justify-between items-center">
          <Button
            data-testid="button-leave-room"
            onClick={handleLeaveRoom}
            variant="outline"
            className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <i className="fas fa-sign-out-alt mr-2" />
            Leave Room
          </Button>
          
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Share this code with friends to join:</p>
            <p className="text-2xl font-bold text-secondary font-mono">{room.code}</p>
          </div>
          
          <div className="w-24" /> {/* Spacer for symmetry */}
        </div>
      </div>
    </div>
  );
}
