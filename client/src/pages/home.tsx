import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { type GameMode } from "@shared/schema";

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [hostName, setHostName] = useState("");
  const [gameMode, setGameMode] = useState<GameMode>("normal");
  const [maxPlayers, setMaxPlayers] = useState(12);
  const [joinCode, setJoinCode] = useState("");
  const [playerName, setPlayerName] = useState("");

  const handleCreateRoom = async () => {
    if (!hostName.trim()) {
      toast({
        title: "Error",
        description: "Please enter your name",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const response = await apiRequest("POST", "/api/rooms", {
        hostName: hostName.trim(),
        gameMode,
        maxPlayers,
      });
      
      const { room } = await response.json();
      setLocation(`/lobby/${room.code}?host=${encodeURIComponent(hostName.trim())}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create room. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!joinCode.trim() || !playerName.trim()) {
      toast({
        title: "Error", 
        description: "Please enter both room code and your name",
        variant: "destructive",
      });
      return;
    }

    setIsJoining(true);
    try {
      const response = await apiRequest("GET", `/api/rooms/${joinCode.trim().toUpperCase()}`);
      await response.json();
      
      setLocation(`/lobby/${joinCode.trim().toUpperCase()}?player=${encodeURIComponent(playerName.trim())}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Room not found. Please check the code and try again.",
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center">
              <i className="fas fa-palette text-2xl text-white" />
            </div>
            <div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                DrawTelephone
              </h1>
              <p className="text-xl text-muted-foreground mt-2">
                Better Gartic Phone with Professional Art Tools
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <i className="fas fa-users text-accent" />
              <span>4-15 Players</span>
            </div>
            <div className="flex items-center gap-2">
              <i className="fas fa-clock text-secondary" />
              <span>Real-time</span>
            </div>
            <div className="flex items-center gap-2">
              <i className="fas fa-paint-brush text-primary" />
              <span>Pro Tools</span>
            </div>
            <div className="flex items-center gap-2">
              <i className="fas fa-layer-group text-accent" />
              <span>Layers & Filters</span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Create Room */}
          <Card className="bg-card border-border">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-plus text-primary text-xl" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Create Room</h2>
                <p className="text-muted-foreground mt-2">Start a new game with your friends</p>
              </div>

              <div className="space-y-6">
                <div>
                  <Label htmlFor="hostName" className="text-foreground font-medium">Your Name</Label>
                  <Input
                    id="hostName"
                    data-testid="input-host-name"
                    placeholder="Enter your name"
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                    className="mt-2 bg-input border-border text-foreground"
                    maxLength={50}
                  />
                </div>

                <div>
                  <Label htmlFor="gameMode" className="text-foreground font-medium">Game Mode</Label>
                  <Select value={gameMode} onValueChange={(value: GameMode) => setGameMode(value)}>
                    <SelectTrigger data-testid="select-game-mode" className="mt-2 bg-input border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="normal">Normal - Classic telephone game</SelectItem>
                      <SelectItem value="secret">Secret - Hidden prompts mode</SelectItem>
                      <SelectItem value="score">Score - Competitive points</SelectItem>
                      <SelectItem value="masterpiece">Masterpiece - Extended time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="maxPlayers" className="text-foreground font-medium">Max Players</Label>
                  <Select value={maxPlayers.toString()} onValueChange={(value) => setMaxPlayers(parseInt(value))}>
                    <SelectTrigger data-testid="select-max-players" className="mt-2 bg-input border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {Array.from({ length: 12 }, (_, i) => i + 4).map((num) => (
                        <SelectItem key={num} value={num.toString()}>{num} players</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  data-testid="button-create-room"
                  onClick={handleCreateRoom}
                  disabled={isCreating}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 text-lg font-semibold"
                >
                  {isCreating ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-plus mr-2" />
                      Create Room
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Join Room */}
          <Card className="bg-card border-border">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-sign-in-alt text-accent text-xl" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Join Room</h2>
                <p className="text-muted-foreground mt-2">Enter a room code to join existing game</p>
              </div>

              <div className="space-y-6">
                <div>
                  <Label htmlFor="joinCode" className="text-foreground font-medium">Room Code</Label>
                  <Input
                    id="joinCode"
                    data-testid="input-join-code"
                    placeholder="Enter 6-digit code"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="mt-2 bg-input border-border text-foreground text-center text-2xl font-mono tracking-widest"
                    maxLength={6}
                  />
                </div>

                <div>
                  <Label htmlFor="playerName" className="text-foreground font-medium">Your Name</Label>
                  <Input
                    id="playerName"
                    data-testid="input-player-name"
                    placeholder="Enter your name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="mt-2 bg-input border-border text-foreground"
                    maxLength={50}
                  />
                </div>

                <Button
                  data-testid="button-join-room"
                  onClick={handleJoinRoom}
                  disabled={isJoining}
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground py-3 text-lg font-semibold"
                >
                  {isJoining ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-sign-in-alt mr-2" />
                      Join Room
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <div className="mt-16 grid md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center mx-auto mb-3">
              <i className="fas fa-paint-brush text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Professional Tools</h3>
            <p className="text-sm text-muted-foreground">Advanced brushes, shapes, and drawing tools</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center mx-auto mb-3">
              <i className="fas fa-layer-group text-accent" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Layers & Filters</h3>
            <p className="text-sm text-muted-foreground">Layer management and Photoshop-like effects</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 bg-secondary/20 rounded-lg flex items-center justify-center mx-auto mb-3">
              <i className="fas fa-users text-secondary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Real-time Multiplayer</h3>
            <p className="text-sm text-muted-foreground">See others drawing live with instant sync</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 bg-chart-3/20 rounded-lg flex items-center justify-center mx-auto mb-3">
              <i className="fas fa-download text-chart-3" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">GIF Export</h3>
            <p className="text-sm text-muted-foreground">Export game results as shareable animations</p>
          </div>
        </div>
      </div>
    </div>
  );
}
