import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { type Room, type GameChain } from "@shared/schema";

export default function Results() {
  const [match, params] = useRoute("/results/:roomId");
  const [, setLocation] = useLocation();
  const [selectedChain, setSelectedChain] = useState(0);

  // Fetch game results
  const { data: roomData } = useQuery({
    queryKey: ["/api/rooms", params?.roomId],
    enabled: !!params?.roomId,
  });

  const { data: chainsData } = useQuery({
    queryKey: ["/api/rooms", params?.roomId, "chains"],
    enabled: !!params?.roomId,
  });

  if (!match) return null;

  const room = (roomData as any)?.room as Room;
  const chains = ((chainsData as any)?.chains as GameChain[]) || [];

  if (!room) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading results...</p>
        </div>
      </div>
    );
  }

  const currentChain = chains[selectedChain];
  const winners = room.players
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-background text-foreground p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
              <i className="fas fa-trophy text-xl text-white" />
            </div>
            <h1 className="text-3xl font-bold text-primary">Game Results</h1>
          </div>
          
          <div className="bg-card border border-border rounded-xl p-4 inline-block">
            <div className="text-lg font-bold text-foreground mb-1">Room {room.code}</div>
            <div className="text-sm text-muted-foreground">Game Complete!</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Leaderboard */}
          <div className="lg:col-span-1">
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <i className="fas fa-trophy text-secondary" />
                  Leaderboard
                </h3>
                
                <div className="space-y-3">
                  {winners.map((player, index) => (
                    <div
                      key={player.id}
                      className={`p-3 rounded-lg ${
                        index === 0 ? "bg-gradient-to-r from-secondary/20 to-secondary/10 border border-secondary/30" :
                        index === 1 ? "bg-muted/50" :
                        "bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 ? "bg-secondary text-secondary-foreground" :
                          index === 1 ? "bg-muted text-foreground" :
                          "bg-muted-foreground text-muted"
                        }`}>
                          {index + 1}
                        </div>
                        
                        <div className="flex-1">
                          <div className="font-semibold text-foreground text-sm">{player.name}</div>
                          <div className="text-xs text-muted-foreground">{player.score} points</div>
                        </div>
                        
                        {index === 0 && (
                          <i className="fas fa-crown text-secondary" />
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {room.players.length > 3 && (
                    <div className="text-center pt-2">
                      <Button variant="ghost" size="sm" className="text-muted-foreground">
                        View All Players
                      </Button>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-border space-y-2">
                  <Button
                    data-testid="button-export-gif"
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                  >
                    <i className="fas fa-download mr-2" />
                    Export as GIF
                  </Button>
                  
                  <Button
                    data-testid="button-play-again"
                    onClick={() => setLocation("/")}
                    variant="outline"
                    className="w-full"
                  >
                    <i className="fas fa-play mr-2" />
                    Play Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chain Viewer */}
          <div className="lg:col-span-3">
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-foreground">Drawing Chains</h3>
                  
                  <div className="flex gap-2">
                    {chains.map((_, index) => (
                      <Button
                        key={index}
                        data-testid={`button-chain-${index}`}
                        onClick={() => setSelectedChain(index)}
                        variant={selectedChain === index ? "default" : "outline"}
                        size="sm"
                        className={selectedChain === index ? "bg-primary" : ""}
                      >
                        Chain {index + 1}
                      </Button>
                    ))}
                  </div>
                </div>

                {currentChain && (
                  <div className="space-y-6">
                    {/* Chain Steps */}
                    <div className="grid gap-4">
                      {currentChain.steps.map((step, index) => (
                        <div key={index} className="bg-muted/30 rounded-xl p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <Badge variant="outline" className="text-xs">
                              Round {step.round}
                            </Badge>
                            <span className="text-sm font-medium text-foreground">
                              {room.players.find(p => p.id === step.playerId)?.name}
                            </span>
                            <Badge 
                              variant="secondary" 
                              className={
                                step.type === "prompt" ? "bg-secondary/20 text-secondary" :
                                step.type === "drawing" ? "bg-primary/20 text-primary" :
                                "bg-accent/20 text-accent"
                              }
                            >
                              {step.type}
                            </Badge>
                          </div>
                          
                          <div className="bg-background rounded-lg p-4">
                            {step.type === "prompt" || step.type === "guess" ? (
                              <p className="text-foreground text-lg italic">"{step.content}"</p>
                            ) : (
                              <div className="bg-white rounded-lg p-4 min-h-32 flex items-center justify-center">
                                <span className="text-muted-foreground italic">Drawing preview</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Final Result */}
                    {currentChain.finalResult && (
                      <div className="bg-gradient-to-r from-secondary/10 to-accent/10 border border-secondary/30 rounded-xl p-6">
                        <h4 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                          <i className="fas fa-flag-checkered text-secondary" />
                          Final Result
                        </h4>
                        <p className="text-xl text-foreground italic">"{currentChain.finalResult}"</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
