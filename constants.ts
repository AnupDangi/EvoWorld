import { WorldState, TileType, AgentState } from './types';

export const GRID_WIDTH = 12;
export const GRID_HEIGHT = 8;
export const TILE_SIZE = 48;

export const INITIAL_WORLD: WorldState = {
  width: GRID_WIDTH,
  height: GRID_HEIGHT,
  name: "Genesis Grid",
  description: "A simple enclosed area with a few obstacles.",
  grid: Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(TileType.EMPTY)),
  rules: [
    { tileType: TileType.WALL, effect: 'block', value: 0, description: "Blocks movement (Jumpable)" },
    { tileType: TileType.LAVA, effect: 'damage', value: 10, description: "Burns the agent (Fire Resist helps)" },
    { tileType: TileType.WATER, effect: 'block', value: 0, description: "Requires swim ability" },
    { tileType: TileType.TREASURE, effect: 'reward', value: 50, description: "Grants gold" },
    { tileType: TileType.MOUNTAIN, effect: 'block', value: 0, description: "High peaks (Requires Jump)" }
  ],
  objects: []
};

// Initialize some walls for the starter world
for (let x = 0; x < GRID_WIDTH; x++) {
  INITIAL_WORLD.grid[0][x] = TileType.WALL;
  INITIAL_WORLD.grid[GRID_HEIGHT - 1][x] = TileType.WALL;
}
for (let y = 0; y < GRID_HEIGHT; y++) {
  INITIAL_WORLD.grid[y][0] = TileType.WALL;
  INITIAL_WORLD.grid[y][GRID_WIDTH - 1] = TileType.WALL;
}
// Add a few random obstacles
INITIAL_WORLD.grid[3][3] = TileType.WALL;
INITIAL_WORLD.grid[3][4] = TileType.WALL;
INITIAL_WORLD.grid[4][3] = TileType.WALL;
INITIAL_WORLD.grid[5][8] = TileType.LAVA;
INITIAL_WORLD.grid[5][9] = TileType.LAVA;

export const INITIAL_AGENT: AgentState = {
  x: 1,
  y: 1,
  abilities: {
    swim: false,
    jump: false,
    fireResist: false
  },
  score: 0,
  health: 100
};

export const ACTIONS = [
  { id: 0, name: 'UP', dx: 0, dy: -1 },
  { id: 1, name: 'DOWN', dx: 0, dy: 1 },
  { id: 2, name: 'LEFT', dx: -1, dy: 0 },
  { id: 3, name: 'RIGHT', dx: 1, dy: 0 }
];

export const TILE_COLORS: Record<string, string> = {
  [TileType.EMPTY]: '#1a1a1a', // Dark gray
  [TileType.WALL]: '#525252', // Stone gray
  [TileType.WATER]: '#2563eb', // Blue
  [TileType.LAVA]: '#dc2626', // Red
  [TileType.TREASURE]: '#fbbf24', // Gold
  [TileType.FOREST]: '#166534', // Green
  [TileType.ICE]: '#a5f3fc', // Cyan
  [TileType.MOUNTAIN]: '#78716c', // Stone 500
};