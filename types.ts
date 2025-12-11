export type GameGenre = 'MAZE' | 'FLAPPY' | 'RUNNER' | 'MASTER';

// --- Shared ---
export interface LogEntry {
  id: string;
  timestamp: string;
  genre: GameGenre;
  source: 'SYSTEM' | 'AGENT' | 'GEMINI' | 'USER';
  message: string;
}

export interface PatchOperation {
  op: 'replace' | 'add' | 'remove';
  path: string;
  value?: any;
}

// Struct for Gemini's proposal
export interface ChallengeProposal {
  title: string;
  description: string;
  patch: PatchOperation[];
}

export interface EvolutionResponse {
  patch: PatchOperation[];
  log: string;
}

// Track level progress per genre
export interface LevelProgress {
  current: number;
  max: number; // e.g., 3 levels before Master
  status: 'TRAINING' | 'PROPOSING' | 'WAITING_FOR_APPROVAL' | 'FINISHED';
  winsRequired: number;
  winsCurrent: number;
}

// --- Maze World (Grid) ---
export interface MazeState {
  width: number;
  height: number;
  grid: string[][]; 
  agent: { x: number; y: number; score: number; dead: boolean };
}

// --- Flappy World (Physics) ---
export interface FlappyState {
  width: number;
  height: number;
  agent: { y: number; velocity: number; score: number; dead: boolean };
  pipes: { x: number; gapY: number; gapSize: number }[];
  config: { gravity: number; jumpStrength: number; speed: number; spawnRate: number };
}

// --- Runner World (Lanes) ---
export interface RunnerState {
  lanes: number;
  length: number;
  agent: { lane: number; score: number; dead: boolean };
  obstacles: { lane: number; y: number; type: 'rock' | 'coin' }[];
  config: { speed: number; spawnRate: number };
}

// --- Master World (Hybrid) ---
export interface MasterState {
  mode: 'MAZE' | 'FLAPPY' | 'RUNNER';
  maze: MazeState;
  flappy: FlappyState;
  runner: RunnerState;
  score: number;
}

// --- RL Interfaces ---
export interface RLAction {
  id: number;
  name: string;
}

export interface QTable {
  [stateKey: string]: number[];
}

// --- Legacy / Advanced Grid Types (Required by constants, GameCanvas, etc) ---

export enum TileType {
  EMPTY = 'empty',
  WALL = 'wall',
  WATER = 'water',
  LAVA = 'lava',
  TREASURE = 'treasure',
  FOREST = 'forest',
  ICE = 'ice',
  MOUNTAIN = 'mountain'
}

export interface AgentAbilities {
  swim: boolean;
  jump: boolean;
  fireResist: boolean;
}

export interface AgentState {
  x: number;
  y: number;
  abilities: AgentAbilities;
  score: number;
  health: number;
}

export interface WorldRule {
  tileType: TileType;
  effect: 'block' | 'damage' | 'reward';
  value: number;
  description: string;
}

export interface WorldObject {
  x: number;
  y: number;
  type: string;
}

export interface WorldState {
  width: number;
  height: number;
  name: string;
  description: string;
  grid: TileType[][];
  rules: WorldRule[];
  objects: WorldObject[];
}
