import { useState, useCallback } from "react";
import { type Room, type Player, type GamePhase } from "@shared/schema";

interface GameState {
  room: Room | null;
  currentPlayer: Player | null;
  timeLeft: number;
  currentPrompt: string;
  isHost: boolean;
}

interface UseGameStateReturn {
  gameState: GameState;
  updateGameState: (room: Room) => void;
  setCurrentPlayer: (player: Player) => void;
  setTimeLeft: (time: number) => void;
  setCurrentPrompt: (prompt: string) => void;
  resetGameState: () => void;
}

const initialGameState: GameState = {
  room: null,
  currentPlayer: null,
  timeLeft: 0,
  currentPrompt: "",
  isHost: false,
};

export function useGameState(): UseGameStateReturn {
  const [gameState, setGameState] = useState<GameState>(initialGameState);

  const updateGameState = useCallback((room: Room) => {
    setGameState(prev => ({
      ...prev,
      room,
      isHost: prev.currentPlayer?.isHost || false,
    }));
  }, []);

  const setCurrentPlayer = useCallback((player: Player) => {
    setGameState(prev => ({
      ...prev,
      currentPlayer: player,
      isHost: player.isHost,
    }));
  }, []);

  const setTimeLeft = useCallback((time: number) => {
    setGameState(prev => ({
      ...prev,
      timeLeft: time,
    }));
  }, []);

  const setCurrentPrompt = useCallback((prompt: string) => {
    setGameState(prev => ({
      ...prev,
      currentPrompt: prompt,
    }));
  }, []);

  const resetGameState = useCallback(() => {
    setGameState(initialGameState);
  }, []);

  return {
    gameState,
    updateGameState,
    setCurrentPlayer,
    setTimeLeft,
    setCurrentPrompt,
    resetGameState,
  };
}
