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

            // Broadcast game started
            broadcastToRoom(roomId, {
              type: "game_started",
              data: { room: updatedRoom }
            });

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

            // Find the prompt for this player (from game chain or previous round)
            const prompt = "Sample prompt"; // TODO: Get actual prompt from game state

            // Save drawing
            await storage.createDrawing({
              roomId,
              playerId: connection.playerId,
              round: room.currentRound,
              prompt,
              canvasData,
              imageUrl,
              timeSpent: 0,
            });

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

            // If all finished, move to next phase
            if (allFinished && updatedRoom) {
              // Move to guessing phase or next round
              const nextPhase = updatedRoom.currentPhase === "drawing" ? "guessing" : "writing";
              const nextRound = nextPhase === "writing" ? updatedRoom.currentRound + 1 : updatedRoom.currentRound;
              
              await storage.updateRoom(roomId, {
                currentPhase: nextPhase,
                currentRound: nextRound
              });

              // Reset player statuses
              for (const player of updatedRoom.players) {
                await storage.updatePlayer(roomId, player.id, { status: "waiting" });
              }

              const finalRoom = await storage.getRoom(roomId);
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

            // TODO: Find the drawing this player is guessing
            const drawingId = "sample-drawing-id";

            // Save guess
            await storage.createGuess({
              roomId,
              playerId: connection.playerId,
              drawingId,
              round: room.currentRound,
              guess,
              points: 0,
              timeSpent: 0,
            });

            // Update player status
            await storage.updatePlayer(roomId, connection.playerId, { status: "finished" });

            // Similar logic to drawing submission for phase progression
            const updatedRoom = await storage.getRoom(roomId);
            broadcastToRoom(roomId, {
              type: "guess_submitted",
              data: { playerId: connection.playerId, room: updatedRoom }
            });

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
        // Check if game is active
        const room = await storage.getRoom(connection.roomId);
        
        // Only remove player if room is in lobby/waiting phase
        // During active game, keep players in room even if they disconnect
        if (room && room.currentPhase === "lobby") {
          // Remove player from room only in lobby
          await storage.removePlayerFromRoom(connection.roomId, connection.playerId);
          
          // Broadcast player disconnected
          broadcastToRoom(connection.roomId, {
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
