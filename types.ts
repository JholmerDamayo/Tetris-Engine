
export type ShapeType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';

export interface Tetromino {
  shape: number[][];
  color: string;
  type: ShapeType;
}

export interface Position {
  x: number;
  y: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlockedAt?: number;
}

export interface GameStats {
  score: number;
  lines: number;
  level: number;
  piecesPlaced: number;
  timeSurvived: number;
  lpm: number;
  misdrops: number;
  holdCount: number;
  gamesPlayed: number;
}

export enum GameStatus {
  START = 'START',
  LOBBY = 'LOBBY',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAMEOVER = 'GAMEOVER',
}

export interface User {
  id: string;
  fullname: string;
  email: string;
  password?: string; // Stored locally
  age?: string;
  gender?: string;
  createdAt: number;
}

// Multiplayer Types
export interface PlayerState {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  isAlive: boolean;
  grid: (string | null)[][];
  score: number;
  level: number;
  lines: number;
  activePiece: Tetromino | null;
  nextPiece: Tetromino | null;
  heldPiece: Tetromino | null;
  pos: Position;
  garbageQueue: number; // Number of garbage lines waiting to be added
}

export type NetworkMessageType = 
  | 'JOIN_REQUEST'
  | 'ROOM_STATE'
  | 'PLAYER_READY'
  | 'GAME_START'
  | 'PLAYER_INPUT' // Move, Rotate, Drop, Hold
  | 'GAME_UPDATE' // Broadcasted by host
  | 'GARBAGE_SEND'
  | 'GAME_OVER'
  | 'CHAT';

export interface NetworkMessage {
  type: NetworkMessageType;
  senderId: string;
  payload: any;
  timestamp: number;
}
