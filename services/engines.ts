import { MazeState, FlappyState, RunnerState, RLAction } from '../types';

// --- MAZE ENGINE ---
export const MAZE_ACTIONS: RLAction[] = [
  { id: 0, name: 'UP' },
  { id: 1, name: 'DOWN' },
  { id: 2, name: 'LEFT' },
  { id: 3, name: 'RIGHT' }
];

export const initMaze = (w=10, h=10): MazeState => ({
  width: w,
  height: h,
  grid: Array(h).fill(null).map(() => Array(w).fill('empty')),
  agent: { x: 1, y: 1, score: 0, dead: false }
});

export const stepMaze = (state: MazeState, actionIdx: number): MazeState => {
  const s = JSON.parse(JSON.stringify(state)); // Deep copy
  if (s.agent.dead) { // Reset
    s.agent.x = 1; s.agent.y = 1; s.agent.dead = false; s.agent.score = 0;
    return s;
  }

  let dx = 0, dy = 0;
  if (actionIdx === 0) dy = -1;
  if (actionIdx === 1) dy = 1;
  if (actionIdx === 2) dx = -1;
  if (actionIdx === 3) dx = 1;

  const nx = s.agent.x + dx;
  const ny = s.agent.y + dy;

  if (nx >= 0 && nx < s.width && ny >= 0 && ny < s.height) {
    const tile = s.grid[ny][nx];
    if (tile !== 'wall') {
      s.agent.x = nx;
      s.agent.y = ny;
    }
    
    if (tile === 'hazard') {
        s.agent.score -= 10;
        s.agent.dead = true;
    } else if (tile === 'goal') {
        s.agent.score += 50;
        // Teleport back to start for continuous learning
        s.agent.x = 1; s.agent.y = 1;
    } else {
        s.agent.score -= 0.1; // Step cost
    }
  } else {
      s.agent.score -= 1; // Wall hit
  }
  return s;
};


// --- FLAPPY ENGINE ---
export const FLAPPY_ACTIONS: RLAction[] = [
  { id: 0, name: 'IDLE' },
  { id: 1, name: 'JUMP' }
];

export const initFlappy = (): FlappyState => ({
  width: 400,
  height: 300,
  agent: { y: 150, velocity: 0, score: 0, dead: false },
  pipes: [],
  config: { gravity: 0.8, jumpStrength: -8, speed: 3, spawnRate: 100 }
});

export const stepFlappy = (state: FlappyState, actionIdx: number): FlappyState => {
  const s = JSON.parse(JSON.stringify(state));
  if (s.agent.dead) {
     return initFlappy();
  }

  // Physics
  if (actionIdx === 1) s.agent.velocity = s.config.jumpStrength;
  s.agent.velocity += s.config.gravity;
  s.agent.y += s.agent.velocity;

  // Pipes
  // Move
  s.pipes.forEach((p: any) => p.x -= s.config.speed);
  // Remove off-screen
  s.pipes = s.pipes.filter((p: any) => p.x > -50);
  // Spawn
  if (Math.random() * 1000 < s.config.spawnRate && (s.pipes.length === 0 || s.pipes[s.pipes.length-1].x < s.width - 150)) {
      s.pipes.push({
          x: s.width,
          gapY: Math.random() * (s.height - 100) + 50,
          gapSize: 80
      });
  }

  // Collision
  if (s.agent.y < 0 || s.agent.y > s.height) s.agent.dead = true;
  s.pipes.forEach((p: any) => {
      // Simple AABB
      if (p.x < 30 && p.x + 40 > 10) { // Agent is roughly at x=20, width 20
          if (s.agent.y < p.gapY - p.gapSize/2 || s.agent.y > p.gapY + p.gapSize/2) {
              s.agent.dead = true;
          }
      }
      // Score pass
      if (p.x + 40 < 10 && !p.passed) {
          s.agent.score += 10;
          p.passed = true;
      }
  });

  if (!s.agent.dead) s.agent.score += 0.1; // Survival reward
  else s.agent.score -= 10;

  return s;
};


// --- RUNNER ENGINE ---
export const RUNNER_ACTIONS: RLAction[] = [
  { id: 0, name: 'STAY' },
  { id: 1, name: 'LEFT' },
  { id: 2, name: 'RIGHT' }
];

export const initRunner = (): RunnerState => ({
  lanes: 5,
  length: 400, // Visual length
  agent: { lane: 2, score: 0, dead: false },
  obstacles: [],
  config: { speed: 4, spawnRate: 0.05 } // spawnRate is probability per tick
});

export const stepRunner = (state: RunnerState, actionIdx: number): RunnerState => {
  const s = JSON.parse(JSON.stringify(state));
  if (s.agent.dead) return initRunner();

  // Action
  if (actionIdx === 1 && s.agent.lane > 0) s.agent.lane--;
  if (actionIdx === 2 && s.agent.lane < s.lanes - 1) s.agent.lane++;

  // Obstacles
  // Move
  s.obstacles.forEach((o: any) => o.y += s.config.speed);
  // Remove
  s.obstacles = s.obstacles.filter((o: any) => o.y < s.length);
  // Spawn
  if (Math.random() < s.config.spawnRate) {
      s.obstacles.push({
          lane: Math.floor(Math.random() * s.lanes),
          y: -20,
          type: Math.random() > 0.8 ? 'coin' : 'rock'
      });
  }

  // Collision
  // Agent is at y = s.length - 40
  const agentY = s.length - 40;
  s.obstacles.forEach((o: any) => {
      if (o.lane === s.agent.lane && Math.abs(o.y - agentY) < 20) {
          if (o.type === 'rock') {
              s.agent.dead = true;
              s.agent.score -= 20;
          } else {
              s.agent.score += 50;
              o.y = s.length + 100; // Consume
          }
      }
  });

  if (!s.agent.dead) s.agent.score += 0.5;

  return s;
};
