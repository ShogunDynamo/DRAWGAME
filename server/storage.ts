import { type Room, type Player, type Drawing, type Guess, type GameChain, type InsertRoom, type InsertPlayer, type InsertDrawing, type InsertGuess, type InsertGameChain } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Room operations
  createRoom(room: InsertRoom): Promise<Room>;
  getRoom(id: string): Promise<Room | undefined>;
  getRoomByCode(code: string): Promise<Room | undefined>;
  updateRoom(id: string, updates: Partial<Room>): Promise<Room | undefined>;
  deleteRoom(id: string): Promise<boolean>;
  
  // Player operations
  addPlayerToRoom(roomId: string, player: InsertPlayer): Promise<Player | undefined>;
  removePlayerFromRoom(roomId: string, playerId: string): Promise<boolean>;
  updatePlayer(roomId: string, playerId: string, updates: Partial<Player>): Promise<Player | undefined>;
  getPlayer(roomId: string, playerId: string): Promise<Player | undefined>;
  
  // Drawing operations
  createDrawing(drawing: InsertDrawing): Promise<Drawing>;
  getDrawing(id: string): Promise<Drawing | undefined>;
  getDrawingsByRoom(roomId: string): Promise<Drawing[]>;
  getDrawingsByRound(roomId: string, round: number): Promise<Drawing[]>;
  
  // Guess operations
  createGuess(guess: InsertGuess): Promise<Guess>;
  getGuess(id: string): Promise<Guess | undefined>;
  getGuessesByRoom(roomId: string): Promise<Guess[]>;
  getGuessesByRound(roomId: string, round: number): Promise<Guess[]>;
  
  // Game chain operations
  createGameChain(chain: InsertGameChain): Promise<GameChain>;
  getGameChain(id: string): Promise<GameChain | undefined>;
  getGameChainsByRoom(roomId: string): Promise<GameChain[]>;
  updateGameChain(id: string, updates: Partial<GameChain>): Promise<GameChain | undefined>;
}

export class MemStorage implements IStorage {
  private rooms: Map<string, Room> = new Map();
  private drawings: Map<string, Drawing> = new Map();
  private guesses: Map<string, Guess> = new Map();
  private gameChains: Map<string, GameChain> = new Map();

  // Room operations
  async createRoom(insertRoom: InsertRoom): Promise<Room> {
    const id = randomUUID();
    const room: Room = { ...insertRoom, id, createdAt: new Date() };
    this.rooms.set(id, room);
    return room;
  }

  async getRoom(id: string): Promise<Room | undefined> {
    return this.rooms.get(id);
  }

  async getRoomByCode(code: string): Promise<Room | undefined> {
    return Array.from(this.rooms.values()).find(room => room.code === code);
  }

  async updateRoom(id: string, updates: Partial<Room>): Promise<Room | undefined> {
    const room = this.rooms.get(id);
    if (!room) return undefined;
    
    const updatedRoom = { ...room, ...updates };
    this.rooms.set(id, updatedRoom);
    return updatedRoom;
  }

  async deleteRoom(id: string): Promise<boolean> {
    return this.rooms.delete(id);
  }

  // Player operations
  async addPlayerToRoom(roomId: string, insertPlayer: InsertPlayer): Promise<Player | undefined> {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;

    const playerId = randomUUID();
    const player: Player = { ...insertPlayer, id: playerId };
    
    const updatedRoom = {
      ...room,
      players: [...room.players, player]
    };
    
    this.rooms.set(roomId, updatedRoom);
    return player;
  }

  async removePlayerFromRoom(roomId: string, playerId: string): Promise<boolean> {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const updatedRoom = {
      ...room,
      players: room.players.filter(p => p.id !== playerId)
    };
    
    this.rooms.set(roomId, updatedRoom);
    return true;
  }

  async updatePlayer(roomId: string, playerId: string, updates: Partial<Player>): Promise<Player | undefined> {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;

    const playerIndex = room.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return undefined;

    const updatedPlayer = { ...room.players[playerIndex], ...updates };
    const updatedPlayers = [...room.players];
    updatedPlayers[playerIndex] = updatedPlayer;

    const updatedRoom = { ...room, players: updatedPlayers };
    this.rooms.set(roomId, updatedRoom);
    
    return updatedPlayer;
  }

  async getPlayer(roomId: string, playerId: string): Promise<Player | undefined> {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    
    return room.players.find(p => p.id === playerId);
  }

  // Drawing operations
  async createDrawing(insertDrawing: InsertDrawing): Promise<Drawing> {
    const id = randomUUID();
    const drawing: Drawing = { ...insertDrawing, id, createdAt: new Date() };
    this.drawings.set(id, drawing);
    return drawing;
  }

  async getDrawing(id: string): Promise<Drawing | undefined> {
    return this.drawings.get(id);
  }

  async getDrawingsByRoom(roomId: string): Promise<Drawing[]> {
    return Array.from(this.drawings.values()).filter(d => d.roomId === roomId);
  }

  async getDrawingsByRound(roomId: string, round: number): Promise<Drawing[]> {
    return Array.from(this.drawings.values()).filter(d => d.roomId === roomId && d.round === round);
  }

  // Guess operations
  async createGuess(insertGuess: InsertGuess): Promise<Guess> {
    const id = randomUUID();
    const guess: Guess = { ...insertGuess, id, createdAt: new Date() };
    this.guesses.set(id, guess);
    return guess;
  }

  async getGuess(id: string): Promise<Guess | undefined> {
    return this.guesses.get(id);
  }

  async getGuessesByRoom(roomId: string): Promise<Guess[]> {
    return Array.from(this.guesses.values()).filter(g => g.roomId === roomId);
  }

  async getGuessesByRound(roomId: string, round: number): Promise<Guess[]> {
    return Array.from(this.guesses.values()).filter(g => g.roomId === roomId && g.round === round);
  }

  // Game chain operations
  async createGameChain(insertChain: InsertGameChain): Promise<GameChain> {
    const id = randomUUID();
    const chain: GameChain = { ...insertChain, id };
    this.gameChains.set(id, chain);
    return chain;
  }

  async getGameChain(id: string): Promise<GameChain | undefined> {
    return this.gameChains.get(id);
  }

  async getGameChainsByRoom(roomId: string): Promise<GameChain[]> {
    return Array.from(this.gameChains.values()).filter(c => c.roomId === roomId);
  }

  async updateGameChain(id: string, updates: Partial<GameChain>): Promise<GameChain | undefined> {
    const chain = this.gameChains.get(id);
    if (!chain) return undefined;
    
    const updatedChain = { ...chain, ...updates };
    this.gameChains.set(id, updatedChain);
    return updatedChain;
  }
}

export const storage = new MemStorage();
