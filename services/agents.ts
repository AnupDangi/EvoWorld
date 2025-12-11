import { MazeState, FlappyState, RunnerState, RLAction, QTable } from '../types';
import { MAZE_ACTIONS, FLAPPY_ACTIONS, RUNNER_ACTIONS } from './engines';

export class RLAgent {
  public qTable: QTable = {};
  public epsilon = 0.1;
  public alpha = 0.1;
  public gamma = 0.9;
  public actions: RLAction[];
  public episodes = 0; // Track experience

  constructor(actions: RLAction[]) {
    this.actions = actions;
  }

  getQ(state: string): number[] {
    if (!this.qTable[state]) {
      this.qTable[state] = Array(this.actions.length).fill(0);
    }
    return this.qTable[state];
  }

  chooseAction(state: string, forceExploit = false): number {
    // If forceExploit (Master Mode), do not explore
    if (!forceExploit && Math.random() < this.epsilon) {
      return Math.floor(Math.random() * this.actions.length);
    }
    const qs = this.getQ(state);
    let maxV = -Infinity;
    let maxI = 0;
    qs.forEach((v, i) => { if (v > maxV) { maxV = v; maxI = i; } });
    return maxI;
  }

  learn(oldState: string, action: number, reward: number, newState: string) {
    const oldQ = this.getQ(oldState)[action];
    const maxFuture = Math.max(...this.getQ(newState));
    this.qTable[oldState][action] = oldQ + this.alpha * (reward + this.gamma * maxFuture - oldQ);
  }

  // --- Knowledge Transfer ---
  exportBrain(): QTable {
    return JSON.parse(JSON.stringify(this.qTable));
  }

  importBrain(brain: QTable) {
    // Merge new knowledge into existing (or overwrite)
    this.qTable = { ...this.qTable, ...brain };
  }
}

// --- STATE ENCODERS ---

export const encodeMaze = (s: MazeState): string => {
  // Simple encoding: 3x3 window around agent + direction to goal
  let key = "";
  
  // 3x3 Vision
  for(let dy=-1; dy<=1; dy++) {
      for(let dx=-1; dx<=1; dx++) {
          const ny = s.agent.y + dy;
          const nx = s.agent.x + dx;
          if (nx<0 || nx>=s.width || ny<0 || ny>=s.height) key += "W"; // Wall
          else key += s.grid[ny][nx].charAt(0);
      }
  }

  // Goal Direction (Rough)
  // Find goal
  let gx = -1, gy = -1;
  for(let y=0; y<s.height; y++) {
      for(let x=0; x<s.width; x++) {
          if(s.grid[y][x] === 'goal') { gx=x; gy=y; break; }
      }
  }
  
  const dx = gx - s.agent.x;
  const dy = gy - s.agent.y;
  key += `:${Math.sign(dx)}:${Math.sign(dy)}`;

  return key;
};

export const encodeFlappy = (s: FlappyState): string => {
  // Relative dist to next pipe
  const nextPipe = s.pipes.find(p => p.x + 40 > 20); // Find first pipe that hasn't passed agent
  if (!nextPipe) return "NO_PIPE";
  
  const dx = Math.floor((nextPipe.x - 20) / 40); // Quantize X
  const dy = Math.floor((s.agent.y - nextPipe.gapY) / 30); // Quantize Y relative to gap
  const vel = Math.floor(s.agent.velocity / 3); // Quantize Velocity
  return `${dx},${dy},${vel}`;
};

export const encodeRunner = (s: RunnerState): string => {
  // Current lane + lookahead
  const agentY = s.length - 40;
  // Look at closest object in each lane
  const view = Array(s.lanes).fill(0); // 0 safe, 1 rock, 2 coin
  
  s.obstacles.forEach(o => {
      // Only care if it's in front of us within reaction range
      if (o.y < agentY && o.y > agentY - 150) {
          view[o.lane] = o.type === 'rock' ? 1 : 2;
      }
  });
  
  return `${s.agent.lane}:${view.join('')}`;
};