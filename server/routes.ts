import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { wsMessageSchema, insertRoomSchema, insertPlayerSchema, type Room, type Player, type WSMessage } from "@shared/schema";
import { randomBytes } from "crypto";

interface ClientConnection {
  ws: WebSocket;
  playerId?: string;
  roomId?: string;
}

const connections = new Map<string, ClientConnection>();

// Timer management for game phases
interface PhaseTimer {
  roomId: string;
  intervalId: NodeJS.Timeout;
  startTime: number;
  duration: number;
}

const activeTimers = new Map<string, PhaseTimer>();

function startPhaseTimer(roomId: string, duration: number) {
  // Clear any existing timer for this room
  stopPhaseTimer(roomId);

  const startTime = Date.now();
  
  const intervalId = setInterval(async () => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const timeLeft = Math.max(0, duration - elapsed);

    // Broadcast time update to all players in room
    broadcastToRoom(roomId, {
      type: "time_update",
      data: { timeLeft }
    });

    // When time runs out, auto-progress the phase
    if (timeLeft === 0) {
      stopPhaseTimer(roomId);
      await handlePhaseTimeout(roomId);
    }
  }, 1000);

  activeTimers.set(roomId, {
    roomId,
    intervalId,
    startTime,
    duration
  });
}

function stopPhaseTimer(roomId: string) {
  const timer = activeTimers.get(roomId);
  if (timer) {
    clearInterval(timer.intervalId);
    activeTimers.delete(roomId);
  }
}

async function handlePhaseTimeout(roomId: string) {
  const room = await storage.getRoom(roomId);
  if (!room) return;

  // Auto-submit for all players who haven't finished
  const waitingPlayers = room.players.filter(p => p.status === "waiting");
  
  for (const player of waitingPlayers) {
    await storage.updatePlayer(roomId, player.id, { status: "finished" });
  }

  // Progress to next phase
  await progressPhase(roomId);
}

async function progressPhase(roomId: string) {
  const room = await storage.getRoom(roomId);
  if (!room) return;

  if (room.currentPhase === "writing") {
    // Move to drawing phase
    await storage.updateRoom(roomId, {
      currentPhase: "drawing",
      currentRound: 2
    });
  } else if (room.currentPhase === "drawing") {
    // Check if game is done
    const currentCycle = Math.floor(room.currentRound / 2);
    
    if (currentCycle >= room.totalRounds) {
      await storage.updateRoom(roomId, {
        currentPhase: "results"
      });
    } else {
      await storage.updateRoom(roomId, {
        currentPhase: "guessing",
        currentRound: room.currentRound + 1
      });
    }
  } else if (room.currentPhase === "guessing") {
    await storage.updateRoom(roomId, {
      currentPhase: "drawing",
      currentRound: room.currentRound + 1
    });
  }

  // Reset player statuses
  for (const player of room.players) {
    await storage.updatePlayer(roomId, player.id, { status: "waiting" });
  }

  const updatedRoom = await storage.getRoom(roomId);
  
  // Start timer for new phase if not in results
  if (updatedRoom && updatedRoom.currentPhase !== "results" && updatedRoom.currentPhase !== "lobby") {
    const duration = updatedRoom.currentPhase === "drawing" 
      ? updatedRoom.drawingTime 
      : updatedRoom.currentPhase === "writing"
      ? updatedRoom.drawingTime  // Use drawingTime for writing phase
      : updatedRoom.guessingTime;
    startPhaseTimer(roomId, duration);
  }

  broadcastToRoom(roomId, {
    type: "phase_changed",
    data: { room: updatedRoom }
  });
}

function generateRoomCode(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

function broadcastToRoom(roomId: string, message: any, excludeConnectionId?: string) {
  connections.forEach((connection, connectionId) => {
    if (connection.roomId === roomId && 
        connection.ws.readyState === WebSocket.OPEN && 
        connectionId !== excludeConnectionId) {
      connection.ws.send(JSON.stringify(message));
    }
  });
}

// Calculate which chain index a player should work on based on phase and round
// Writing (round 1): Player i works on chain i (writes their own prompt)
// Drawing/Guessing (round 2+): Chains rotate left each time we enter a new drawing phase
// - Round 2 (drawing): chain (i - 1) mod N  
// - Round 3 (guessing): chain (i - 1) mod N (same as round 2)
// - Round 4 (drawing): chain (i - 2) mod N
// - Round 5 (guessing): chain (i - 2) mod N (same as round 4)
// Pattern: rotation = floor((round - 1) / 2) for drawing/guessing
function getChainIndexForPlayer(playerIndex: number, round: number, numPlayers: number, phase: string): number {
  if (phase === "writing") {
    // Everyone works on their own chain
    return playerIndex;
  }
  
  // For drawing/guessing, calculate rotation
  // Round 2 (drawing) = rotation 1: player i gets chain (i+1)%N
  // Round 3 (guessing) = rotation 1: player i gets chain (i+1)%N
  // Round 4 (drawing) = rotation 2: player i gets chain (i+2)%N, etc.
  const rotation = Math.floor(round / 2);
  return (playerIndex + rotation) % numPlayers;
}

// Get the prompt/drawing that a player should work with in the current round
async function getPlayerTask(room: Room, playerId: string): Promise<{ chainIndex: number; prompt?: string; drawingImageUrl?: string; drawingId?: string } | null> {
  const playerIndex = room.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return null;

  const chainIndex = getChainIndexForPlayer(playerIndex, room.currentRound, room.players.length, room.currentPhase);
  const chains = await storage.getGameChainsByRoom(room.id);
  const targetChain = chains.find(c => c.chainIndex === chainIndex);

  if (!targetChain) return { chainIndex };

  // Find the item from the previous phase in the current round
  if (room.currentPhase === "drawing") {
    // Player should draw text (either original prompt or a guess from previous round)
    // Find the most recent text item (prompt or guess) in this chain
    const textSteps = targetChain.steps.filter(s => s.type === "prompt" || s.type === "guess");
    const latestText = textSteps[textSteps.length - 1]; // Most recent text to draw
    return {
      chainIndex,
      prompt: latestText?.content
    };
  } else if (room.currentPhase === "guessing") {
    // Player should guess the drawing from the previous round (drawing was done in currentRound - 1)
    const drawingRound = room.currentRound - 1;
    const drawingSteps = targetChain.steps.filter(s => s.type === "drawing" && s.round === drawingRound);
    const drawingForThisRound = drawingSteps[0]; // Should be only one drawing per round per chain
    
    // Find the actual drawing record to get the ID
    if (drawingForThisRound) {
      const drawings = await storage.getDrawingsByRound(room.id, drawingRound);
      const matchingDrawing = drawings.find(d => 
        d.playerId === drawingForThisRound.playerId && 
        d.imageUrl === drawingForThisRound.content
      );
      
      return {
        chainIndex,
        drawingImageUrl: drawingForThisRound.content,
        drawingId: matchingDrawing?.id
      };
    }
  }

  return { chainIndex };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Room management routes
  app.post("/api/rooms", async (req, res) => {
    try {
      const { hostName, gameMode = "normal", maxPlayers = 12 } = req.body;
      
      if (!hostName || hostName.trim().length === 0) {
        return res.status(400).json({ message: "Host name is required" });
      }

      // Generate unique room code
      let code: string;
      let attempts = 0;
      do {
        code = generateRoomCode();
        const existingRoom = await storage.getRoomByCode(code);
        if (!existingRoom) break;
        attempts++;
      } while (attempts < 10);

      if (attempts >= 10) {
        return res.status(500).json({ message: "Unable to generate unique room code" });
      }

      const roomData = insertRoomSchema.parse({
        code,
        hostId: "", // Will be set when host joins
        gameMode,
        maxPlayers,
        players: [],
      });

      const room = await storage.createRoom(roomData);
      res.json({ room });
    } catch (error) {
      console.error("Error creating room:", error);
      res.status(500).json({ message: "Failed to create room" });
    }
  });

  app.get("/api/rooms/:codeOrId", async (req, res) => {
    try {
      const { codeOrId } = req.params;
      
      // Try to fetch by ID first (UUID format), then by code
      let room = await storage.getRoom(codeOrId);
      
      if (!room) {
        // If not found by ID, try by code (uppercase)
        room = await storage.getRoomByCode(codeOrId.toUpperCase());
      }
      
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      console.log(`[API] GET /api/rooms/${codeOrId} - Room ${room.code} has ${room.players.length} players`);

      res.json({ room });
    } catch (error) {
      console.error("Error fetching room:", error);
      res.status(500).json({ message: "Failed to fetch room" });
    }
  });

  // Game state routes
  app.get("/api/rooms/:roomId/drawings", async (req, res) => {
    try {
      const { roomId } = req.params;
      const drawings = await storage.getDrawingsByRoom(roomId);
      res.json({ drawings });
    } catch (error) {
      console.error("Error fetching drawings:", error);
      res.status(500).json({ message: "Failed to fetch drawings" });
    }
  });

  app.get("/api/rooms/:roomId/guesses", async (req, res) => {
    try {
      const { roomId } = req.params;
      const guesses = await storage.getGuessesByRoom(roomId);
      res.json({ guesses });
    } catch (error) {
      console.error("Error fetching guesses:", error);
      res.status(500).json({ message: "Failed to fetch guesses" });
    }
  });

  app.get("/api/rooms/:roomId/player-task/:playerId", async (req, res) => {
    try {
      const { roomId, playerId } = req.params;
      const room = await storage.getRoom(roomId);
      
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      const playerTask = await getPlayerTask(room, playerId);
      res.json({ task: playerTask });
    } catch (error) {
      console.error("Error fetching player task:", error);
      res.status(500).json({ message: "Failed to fetch player task" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const connectionId = randomBytes(16).toString('hex');
    connections.set(connectionId, { ws });

    ws.on('message', async (data) => {
      try {
        const rawMessage = JSON.parse(data.toString());
        const message: WSMessage = wsMessageSchema.parse(rawMessage);
        const connection = connections.get(connectionId);
        
        if (!connection) return;

        switch (message.type) {
          case "join_room": {
            const { roomCode, playerName } = message.data;
            
            // Find room by code
            const room = await storage.getRoomByCode(roomCode.toUpperCase());
            if (!room) {
              ws.send(JSON.stringify({ type: "error", message: "Room not found" }));
              return;
            }

            // Check if room is full
            if (room.players.length >= room.maxPlayers) {
              ws.send(JSON.stringify({ type: "error", message: "Room is full" }));
              return;
            }

            // Check if name is already taken
            if (room.players.some(p => p.name === playerName)) {
              ws.send(JSON.stringify({ type: "error", message: "Name already taken" }));
              return;
            }

            console.log(`[JOIN_ROOM] Player ${playerName} joining room ${room.code} (${room.id}), current players: ${room.players.length}`);

            // Add player to room
            const player = await storage.addPlayerToRoom(room.id, {
              name: playerName,
              isHost: room.players.length === 0, // First player is host
              socketId: connectionId,
              status: "waiting",
              score: 0,
            });

            console.log(`[JOIN_ROOM] Player ${playerName} added successfully, id: ${player?.id}`);

            if (!player) {
              ws.send(JSON.stringify({ type: "error", message: "Failed to join room" }));
              return;
            }

            // Update host if this is the first player
            if (room.players.length === 0) {
              await storage.updateRoom(room.id, { hostId: player.id });
            }

            // Update connection
            connection.playerId = player.id;
            connection.roomId = room.id;

            // Get updated room
            const updatedRoom = await storage.getRoom(room.id);
            
            // Notify player they joined
            ws.send(JSON.stringify({
              type: "room_joined",
              data: { room: updatedRoom, playerId: player.id }
            }));

            // Broadcast to other players
            broadcastToRoom(room.id, {
              type: "player_joined",
              data: { player, room: updatedRoom }
            }, connectionId);

            break;
          }

          case "leave_room": {
            const { roomId } = message.data;
            
            if (connection.playerId && connection.roomId === roomId) {
              await storage.removePlayerFromRoom(roomId, connection.playerId);
              
              const updatedRoom = await storage.getRoom(roomId);
              
              // Stop timer if room is now empty
              if (!updatedRoom || updatedRoom.players.length === 0) {
                stopPhaseTimer(roomId);
              }
              
              // Broadcast player left
              broadcastToRoom(roomId, {
                type: "player_left",
                data: { playerId: connection.playerId, room: updatedRoom }
              });

              connection.playerId = undefined;
              connection.roomId = undefined;
            }
            break;
          }

          case "start_game": {
            const { roomId } = message.data;
            
            if (!connection.playerId || connection.roomId !== roomId) {
              ws.send(JSON.stringify({ type: "error", message: "Unauthorized" }));
              return;
            }

            const room = await storage.getRoom(roomId);
            if (!room) {
              ws.send(JSON.stringify({ type: "error", message: "Room not found" }));
              return;
            }

            console.log(`[START_GAME] Room ${roomId} has ${room.players.length} players before starting`);

            // Check if player is host
            const player = await storage.getPlayer(roomId, connection.playerId);
            if (!player?.isHost) {
              ws.send(JSON.stringify({ type: "error", message: "Only host can start game" }));
              return;
            }

            // Check minimum players
            if (room.players.length < 4) {
              ws.send(JSON.stringify({ type: "error", message: "Need at least 4 players to start" }));
              return;
            }

            // Update room to start game
            await storage.updateRoom(roomId, {
              currentPhase: "writing",
              currentRound: 1
            });

            // Re-fetch the room to get the latest state with all players
            const updatedRoom = await storage.getRoom(roomId);
            if (!updatedRoom) {
              ws.send(JSON.stringify({ type: "error", message: "Room not found after update" }));
              return;
            }

            console.log(`[START_GAME] Room ${roomId} has ${updatedRoom.players.length} players after update`);

            // Initialize game chains
            for (let i = 0; i < updatedRoom.players.length; i++) {
              await storage.createGameChain({
                roomId,
                chainIndex: i,
                steps: []
              });
            }

            // Start timer for writing phase
            startPhaseTimer(roomId, updatedRoom.drawingTime); // Use drawingTime as default for writing

            // Broadcast game started
            broadcastToRoom(roomId, {
              type: "game_started",
              data: { room: updatedRoom }
            });

            break;
          }

          case "submit_prompt": {
            const { roomId, prompt } = message.data;
            
            if (!connection.playerId || connection.roomId !== roomId) return;

            const room = await storage.getRoom(roomId);
            if (!room || room.currentPhase !== "writing") return;

            // Find the game chain for this player (round 1, chain index = player index)
            const playerIndex = room.players.findIndex(p => p.id === connection.playerId);
            if (playerIndex === -1) return;

            const chains = await storage.getGameChainsByRoom(roomId);
            const playerChain = chains.find(chain => chain.chainIndex === playerIndex);
            
            if (playerChain) {
              // Add prompt as first step in the chain
              await storage.updateGameChain(playerChain.id, {
                steps: [
                  ...playerChain.steps,
                  {
                    type: "prompt" as const,
                    playerId: connection.playerId,
                    content: prompt,
                    round: room.currentRound,
                    timestamp: new Date(),
                  }
                ]
              });
            }

            // Update player status
            await storage.updatePlayer(roomId, connection.playerId, { status: "finished" });

            // Check if all players finished
            const updatedRoom = await storage.getRoom(roomId);
            const allFinished = updatedRoom?.players.every(p => p.status === "finished");

            // Broadcast prompt submitted
            broadcastToRoom(roomId, {
              type: "prompt_submitted",
              data: { playerId: connection.playerId, room: updatedRoom }
            });

            // If all finished, move to drawing phase and increment round
            if (allFinished && updatedRoom) {
              stopPhaseTimer(roomId); // Stop current timer
              
              await storage.updateRoom(roomId, {
                currentPhase: "drawing",
                currentRound: updatedRoom.currentRound + 1
              });

              // Reset player statuses
              for (const player of updatedRoom.players) {
                await storage.updatePlayer(roomId, player.id, { status: "waiting" });
              }

              const finalRoom = await storage.getRoom(roomId);
              
              // Start timer for drawing phase
              if (finalRoom) {
                startPhaseTimer(roomId, finalRoom.drawingTime);
              }
              
              broadcastToRoom(roomId, {
                type: "phase_changed",
                data: { room: finalRoom }
              });
            }

            break;
          }

          case "drawing_update": {
            const { roomId, canvasData } = message.data;
            
            if (connection.roomId !== roomId) return;

            // Broadcast real-time drawing updates to other players
            broadcastToRoom(roomId, {
              type: "drawing_updated",
              data: { playerId: connection.playerId, canvasData }
            }, connectionId);

            break;
          }

          case "submit_drawing": {
            const { roomId, canvasData, imageUrl } = message.data;
            
            if (!connection.playerId || connection.roomId !== roomId) return;

            const room = await storage.getRoom(roomId);
            if (!room) return;

            // Get the prompt for this player from game chain
            const playerTask = await getPlayerTask(room, connection.playerId);
            if (!playerTask) {
              ws.send(JSON.stringify({ type: "error", message: "Could not determine player task" }));
              return;
            }
            
            if (!playerTask.prompt) {
              ws.send(JSON.stringify({ type: "error", message: "No prompt found for this player" }));
              return;
            }

            // Save drawing
            const drawing = await storage.createDrawing({
              roomId,
              playerId: connection.playerId,
              round: room.currentRound,
              prompt: playerTask.prompt,
              canvasData,
              imageUrl,
              timeSpent: 0,
            });

            // Add drawing to the game chain
            const chains = await storage.getGameChainsByRoom(roomId);
            const targetChain = chains.find(c => c.chainIndex === playerTask.chainIndex);
            
            if (targetChain) {
              await storage.updateGameChain(targetChain.id, {
                steps: [
                  ...targetChain.steps,
                  {
                    type: "drawing" as const,
                    playerId: connection.playerId,
                    content: imageUrl, // Store imageUrl as content for drawings
                    round: room.currentRound,
                    timestamp: new Date(),
                  }
                ]
              });
            }

            // Update player status
            await storage.updatePlayer(roomId, connection.playerId, { status: "finished" });

            // Check if all players finished
            const updatedRoom = await storage.getRoom(roomId);
            const allFinished = updatedRoom?.players.every(p => p.status === "finished");

            // Broadcast drawing submitted
            broadcastToRoom(roomId, {
              type: "drawing_submitted",
              data: { playerId: connection.playerId, room: updatedRoom }
            });

            // If all finished, check if game is done or move to guessing
            if (allFinished && updatedRoom) {
              stopPhaseTimer(roomId); // Stop current timer
              
              // Check which draw/guess cycle we just completed
              // Round 2 = cycle 1, Round 4 = cycle 2, etc.
              // totalRounds represents number of draw/guess cycles to play
              const currentCycle = Math.floor(updatedRoom.currentRound / 2);
              
              if (currentCycle >= updatedRoom.totalRounds) {
                // Game is complete, move to results
                await storage.updateRoom(roomId, {
                  currentPhase: "results",
                });
              } else {
                // Continue to guessing phase
                await storage.updateRoom(roomId, {
                  currentPhase: "guessing",
                  currentRound: updatedRoom.currentRound + 1
                });
              }

              // Reset player statuses
              for (const player of updatedRoom.players) {
                await storage.updatePlayer(roomId, player.id, { status: "waiting" });
              }

              const finalRoom = await storage.getRoom(roomId);
              
              // Start timer for next phase (if not in results)
              if (finalRoom && finalRoom.currentPhase === "guessing") {
                startPhaseTimer(roomId, finalRoom.guessingTime);
              }
              
              broadcastToRoom(roomId, {
                type: "phase_changed",
                data: { room: finalRoom }
              });
            }

            break;
          }

          case "submit_guess": {
            const { roomId, guess } = message.data;
            
            if (!connection.playerId || connection.roomId !== roomId) return;

            const room = await storage.getRoom(roomId);
            if (!room) return;

            // Get the drawing this player is guessing
            const playerTask = await getPlayerTask(room, connection.playerId);
            if (!playerTask) {
              ws.send(JSON.stringify({ type: "error", message: "Could not determine player task" }));
              return;
            }
            
            if (!playerTask.drawingImageUrl || !playerTask.drawingId) {
              ws.send(JSON.stringify({ type: "error", message: "No drawing found for this player" }));
              return;
            }

            // Save guess with actual drawing ID
            await storage.createGuess({
              roomId,
              playerId: connection.playerId,
              drawingId: playerTask.drawingId,
              round: room.currentRound,
              guess,
              points: 0,
              timeSpent: 0,
            });

            // Add guess to the game chain
            const chains = await storage.getGameChainsByRoom(roomId);
            const targetChain = chains.find(c => c.chainIndex === playerTask.chainIndex);
            
            if (targetChain) {
              await storage.updateGameChain(targetChain.id, {
                steps: [
                  ...targetChain.steps,
                  {
                    type: "guess" as const,
                    playerId: connection.playerId,
                    content: guess,
                    round: room.currentRound,
                    timestamp: new Date(),
                  }
                ]
              });
            }

            // Update player status
            await storage.updatePlayer(roomId, connection.playerId, { status: "finished" });

            // Check if all players finished
            const updatedRoom = await storage.getRoom(roomId);
            const allFinished = updatedRoom?.players.every(p => p.status === "finished");

            // Broadcast guess submitted
            broadcastToRoom(roomId, {
              type: "guess_submitted",
              data: { playerId: connection.playerId, room: updatedRoom }
            });

            // If all finished, always move back to drawing phase
            if (allFinished && updatedRoom) {
              stopPhaseTimer(roomId); // Stop current timer
              
              // After guessing, always go back to drawing for next cycle
              await storage.updateRoom(roomId, {
                currentPhase: "drawing",
                currentRound: updatedRoom.currentRound + 1
              });

              // Reset player statuses
              for (const player of updatedRoom.players) {
                await storage.updatePlayer(roomId, player.id, { status: "waiting" });
              }

              const finalRoom = await storage.getRoom(roomId);
              
              // Start timer for drawing phase
              if (finalRoom) {
                startPhaseTimer(roomId, finalRoom.drawingTime);
              }
              
              broadcastToRoom(roomId, {
                type: "phase_changed",
                data: { room: finalRoom }
              });
            }

            break;
          }
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
        ws.send(JSON.stringify({ type: "error", message: "Invalid message format" }));
      }
    });

    ws.on('close', async () => {
      const connection = connections.get(connectionId);
      if (connection?.playerId && connection.roomId) {
        const roomId = connection.roomId;
        
        // Check if game is active
        const room = await storage.getRoom(roomId);
        
        // Only remove player if room is in lobby/waiting phase
        // During active game, keep players in room even if they disconnect
        if (room && room.currentPhase === "lobby") {
          // Remove player from room only in lobby
          await storage.removePlayerFromRoom(roomId, connection.playerId);
          
          const updatedRoom = await storage.getRoom(roomId);
          
          // Stop timer if room is now empty
          if (!updatedRoom || updatedRoom.players.length === 0) {
            stopPhaseTimer(roomId);
          }
          
          // Broadcast player disconnected
          broadcastToRoom(roomId, {
            type: "player_disconnected",
            data: { playerId: connection.playerId }
          });
        } else {
          // During active game, just mark as disconnected but keep in room
          // (Could update player status to "disconnected" if needed)
        }
      }
      
      connections.delete(connectionId);
    });
  });

  return httpServer;
}
