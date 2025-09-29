import { z } from "zod";

// Game Types
export const gamePhaseSchema = z.enum(["lobby", "writing", "drawing", "guessing", "results"]);
export const gameModeSchema = z.enum(["normal", "secret", "score", "masterpiece"]);
export const playerStatusSchema = z.enum(["waiting", "active", "finished", "disconnected"]);

// Player Schema
export const playerSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(50),
  avatar: z.string().optional(),
  score: z.number().default(0),
  status: playerStatusSchema.default("waiting"),
  isHost: z.boolean().default(false),
  socketId: z.string().optional(),
});

export const insertPlayerSchema = playerSchema.omit({ id: true });

// Room Schema
export const roomSchema = z.object({
  id: z.string(),
  code: z.string().length(6),
  hostId: z.string(),
  players: z.array(playerSchema).default([]),
  maxPlayers: z.number().min(4).max(15).default(12),
  gameMode: gameModeSchema.default("normal"),
  currentPhase: gamePhaseSchema.default("lobby"),
  currentRound: z.number().default(0),
  totalRounds: z.number().default(6),
  drawingTime: z.number().default(180), // seconds
  guessingTime: z.number().default(60), // seconds
  settings: z.object({
    allowSpectators: z.boolean().default(false),
    enableChat: z.boolean().default(true),
    privateRoom: z.boolean().default(false),
  }).default({}),
  gameData: z.any().optional(), // Stores current game progression data
  createdAt: z.date().default(() => new Date()),
});

export const insertRoomSchema = roomSchema.omit({ id: true, createdAt: true });

// Drawing Schema
export const drawingSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  playerId: z.string(),
  round: z.number(),
  prompt: z.string(),
  canvasData: z.string(), // JSON string of Fabric.js canvas data
  imageUrl: z.string().optional(), // Base64 or URL to image
  timeSpent: z.number().default(0), // seconds
  createdAt: z.date().default(() => new Date()),
});

export const insertDrawingSchema = drawingSchema.omit({ id: true, createdAt: true });

// Guess Schema
export const guessSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  playerId: z.string(),
  drawingId: z.string(),
  round: z.number(),
  guess: z.string().max(200),
  points: z.number().default(0),
  timeSpent: z.number().default(0), // seconds
  createdAt: z.date().default(() => new Date()),
});

export const insertGuessSchema = guessSchema.omit({ id: true, createdAt: true });

// Game Chain Schema (tracks the progression from prompt to final result)
export const gameChainSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  chainIndex: z.number(), // Which chain this is (0, 1, 2, etc.)
  steps: z.array(z.object({
    type: z.enum(["prompt", "drawing", "guess"]),
    playerId: z.string(),
    content: z.string(), // prompt text, drawing data, or guess text
    round: z.number(),
    timestamp: z.date(),
  })),
  finalResult: z.string().optional(), // Final guess or description
});

export const insertGameChainSchema = gameChainSchema.omit({ id: true });

// WebSocket Message Types
export const wsMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("join_room"),
    data: z.object({
      roomCode: z.string(),
      playerName: z.string(),
    }),
  }),
  z.object({
    type: z.literal("leave_room"),
    data: z.object({
      roomId: z.string(),
    }),
  }),
  z.object({
    type: z.literal("start_game"),
    data: z.object({
      roomId: z.string(),
    }),
  }),
  z.object({
    type: z.literal("drawing_update"),
    data: z.object({
      roomId: z.string(),
      canvasData: z.string(),
    }),
  }),
  z.object({
    type: z.literal("submit_drawing"),
    data: z.object({
      roomId: z.string(),
      canvasData: z.string(),
      imageUrl: z.string(),
    }),
  }),
  z.object({
    type: z.literal("submit_guess"),
    data: z.object({
      roomId: z.string(),
      guess: z.string(),
    }),
  }),
  z.object({
    type: z.literal("next_round"),
    data: z.object({
      roomId: z.string(),
    }),
  }),
]);

// Export types
export type GamePhase = z.infer<typeof gamePhaseSchema>;
export type GameMode = z.infer<typeof gameModeSchema>;
export type PlayerStatus = z.infer<typeof playerStatusSchema>;
export type Player = z.infer<typeof playerSchema>;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Room = z.infer<typeof roomSchema>;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Drawing = z.infer<typeof drawingSchema>;
export type InsertDrawing = z.infer<typeof insertDrawingSchema>;
export type Guess = z.infer<typeof guessSchema>;
export type InsertGuess = z.infer<typeof insertGuessSchema>;
export type GameChain = z.infer<typeof gameChainSchema>;
export type InsertGameChain = z.infer<typeof insertGameChainSchema>;
export type WSMessage = z.infer<typeof wsMessageSchema>;
