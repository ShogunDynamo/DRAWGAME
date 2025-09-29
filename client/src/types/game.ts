import { type Room, type Player, type GamePhase, type GameMode } from "@shared/schema";

export interface GameRoomState {
  room: Room;
  currentPlayer: Player;
  timeLeft: number;
  currentPrompt: string;
  isHost: boolean;
}

export interface DrawingData {
  canvasJson: string;
  imageUrl: string;
  playerId: string;
  timestamp: number;
}

export interface GuessData {
  guess: string;
  playerId: string;
  drawingId: string;
  timestamp: number;
}

export interface ToolSettings {
  brush: {
    size: number;
    opacity: number;
    color: string;
    type: "round" | "square" | "marker";
  };
  pencil: {
    size: number;
    opacity: number;
    color: string;
    hardness: number;
  };
  eraser: {
    size: number;
    hardness: number;
  };
  text: {
    fontFamily: string;
    fontSize: number;
    color: string;
    bold: boolean;
    italic: boolean;
    alignment: "left" | "center" | "right";
  };
}

export interface LayerData {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  blendMode: string;
  locked: boolean;
  objects: any[]; // Fabric.js objects
}

export interface FilterSettings {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  sharpen: number;
  sepia: number;
  grayscale: number;
  vintage: number;
  pixelate: number;
}

export interface CanvasState {
  layers: LayerData[];
  activeLayerId: string;
  filters: FilterSettings;
  zoom: number;
  tool: string;
  toolSettings: ToolSettings;
}

export interface GameStatistics {
  totalRounds: number;
  currentRound: number;
  averageDrawingTime: number;
  averageGuessTime: number;
  accuracy: number;
  funniestTransformation: string;
}

export interface PlayerPerformance {
  playerId: string;
  playerName: string;
  totalScore: number;
  averageScore: number;
  bestDrawing: string;
  bestGuess: string;
  timeSpent: number;
}

export interface GameResults {
  room: Room;
  chains: any[]; // GameChain from schema
  statistics: GameStatistics;
  playerPerformances: PlayerPerformance[];
  winnerIds: string[];
}

export interface NotificationData {
  type: "info" | "warning" | "error" | "success";
  title: string;
  message: string;
  duration?: number;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

export interface RealTimeUpdate {
  type: "drawing" | "cursor" | "selection";
  playerId: string;
  data: any;
  timestamp: number;
}

export interface CursorPosition {
  x: number;
  y: number;
  playerId: string;
  playerName: string;
  color: string;
}

export interface GameModeConfig {
  mode: GameMode;
  displayName: string;
  description: string;
  rules: string[];
  defaultDrawingTime: number;
  defaultGuessingTime: number;
  minPlayers: number;
  maxPlayers: number;
  features: string[];
}

export const GAME_MODE_CONFIGS: Record<GameMode, GameModeConfig> = {
  normal: {
    mode: "normal",
    displayName: "Normal",
    description: "Classic telephone game with drawing and guessing",
    rules: [
      "Players take turns writing prompts and drawing",
      "Each player draws someone else's prompt",
      "Others guess what the drawing represents",
      "Results are revealed at the end showing the funny transformations"
    ],
    defaultDrawingTime: 180,
    defaultGuessingTime: 60,
    minPlayers: 4,
    maxPlayers: 15,
    features: ["drawing", "guessing", "results_reveal"]
  },
  secret: {
    mode: "secret",
    displayName: "Secret",
    description: "Hidden prompts mode - prompts are censored while typing",
    rules: [
      "Prompts are hidden from other players until reveal",
      "Adds mystery and unpredictability to the game",
      "Same drawing and guessing mechanics as normal mode"
    ],
    defaultDrawingTime: 180,
    defaultGuessingTime: 60,
    minPlayers: 4,
    maxPlayers: 15,
    features: ["hidden_prompts", "drawing", "guessing", "results_reveal"]
  },
  score: {
    mode: "score",
    displayName: "Score",
    description: "Competitive mode with points for accuracy and creativity",
    rules: [
      "Points awarded for accurate guesses",
      "Bonus points for creative and clear drawings",
      "Leaderboard tracks player rankings",
      "Winner determined by highest score"
    ],
    defaultDrawingTime: 180,
    defaultGuessingTime: 60,
    minPlayers: 4,
    maxPlayers: 15,
    features: ["scoring", "leaderboard", "competitive", "drawing", "guessing"]
  },
  masterpiece: {
    mode: "masterpiece",
    displayName: "Masterpiece",
    description: "Extended time for detailed artwork and creativity",
    rules: [
      "Longer time limits for detailed drawings",
      "Focus on artistic quality over speed",
      "Players can use advanced tools and effects",
      "Perfect for creating impressive artwork"
    ],
    defaultDrawingTime: 600, // 10 minutes
    defaultGuessingTime: 120, // 2 minutes
    minPlayers: 4,
    maxPlayers: 12,
    features: ["extended_time", "advanced_tools", "artistic_focus", "drawing", "guessing"]
  }
};

export type DrawingTool = 
  | "brush" 
  | "pencil" 
  | "eraser" 
  | "fill" 
  | "rectangle" 
  | "circle" 
  | "text" 
  | "eyedropper"
  | "select"
  | "move";

export type BlendMode = 
  | "normal"
  | "multiply"
  | "screen" 
  | "overlay"
  | "soft-light"
  | "hard-light"
  | "color-dodge"
  | "color-burn"
  | "darken"
  | "lighten";

export interface UndoRedoState {
  canUndo: boolean;
  canRedo: boolean;
  historyLength: number;
  currentIndex: number;
}
