
import { ShapeType, Tetromino, Achievement } from './types';

export const COLS = 10;
export const ROWS = 20;
export const MISDROP_THRESHOLD = 6;

export const TETROMINOS: Record<ShapeType, Tetromino> = {
  I: { shape: [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]], color: '#00f0f0', type: 'I' },
  J: { shape: [[0, 1, 0], [0, 1, 0], [1, 1, 0]], color: '#0000f0', type: 'J' },
  L: { shape: [[0, 1, 0], [0, 1, 0], [0, 1, 1]], color: '#f0a000', type: 'L' },
  O: { shape: [[1, 1], [1, 1]], color: '#f0f000', type: 'O' },
  S: { shape: [[0, 1, 1], [1, 1, 0], [0, 0, 0]], color: '#00f000', type: 'S' },
  T: { shape: [[0, 1, 0], [1, 1, 1], [0, 0, 0]], color: '#a000f0', type: 'T' },
  Z: { shape: [[1, 1, 0], [0, 1, 1], [0, 0, 0]], color: '#f00000', type: 'Z' },
};

export const INITIAL_LEVEL = 1;
export const LINES_PER_LEVEL = 10;
export const BASE_SPEED = 850;
export const SPEED_INCREMENT = 75;
export const MINIMUM_SPEED = 120;

export const SCORING = {
  SINGLE: 100,
  DOUBLE: 300,
  TRIPLE: 500,
  TETRIS: 1200,
  SOFT_DROP: 1,
  HARD_DROP: 2,
};

// Multiplayer Garbage Sent
export const GARBAGE_TABLE = {
  SINGLE: 0,
  DOUBLE: 1,
  TRIPLE: 2,
  TETRIS: 4,
  B2B_BONUS: 1,
  COMBO_BONUS: [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 4], // Index is combo count
};

export const ACHIEVEMENTS_LIST: Achievement[] = [
  { id: 'first_line', title: 'First Contact', description: 'Clear your first line' },
  { id: 'ten_lines', title: 'Deca-Clear', description: 'Clear 10 total lines' },
  { id: 'triple_threat', title: 'Triple Threat', description: 'Clear 3 lines at once' },
  { id: 'tetris_master', title: 'Tetris!', description: 'Clear 4 lines at once' },
  { id: 'level_five', title: 'High Velocity', description: 'Reach Level 5' },
  { id: 'fifty_pieces', title: 'Constructor', description: 'Place 50 pieces' },
  { id: 'hold_addict', title: 'Strategist', description: 'Use Hold 20 times in one game' },
  { id: 'survivor', title: 'Survivor', description: 'Survive for 2 minutes' },
];
