import { AgentState, WorldState, RLAction, TileType } from '../types';
import { ACTIONS } from '../constants';

// Simple tabular Q-learning
// State key: "UP:DOWN:LEFT:RIGHT:SWIM:JUMP:FIRERESIST"

type QTable = Record<string, number[]>;

export class RLAgentService {
  private qTable: QTable = {};
  private learningRate = 0.1;
  private discountFactor = 0.9;
  private epsilon = 0.1; // Exploration rate

  constructor() {
    // Ephemeral session learning
  }

  private getStateKey(agent: AgentState, world: WorldState): string {
    const { x, y, abilities } = agent;
    const getTile = (tx: number, ty: number) => {
      if (tx < 0 || tx >= world.width || ty < 0 || ty >= world.height) return TileType.WALL;
      return world.grid[ty][tx];
    };

    const up = getTile(x, y - 1);
    const down = getTile(x, y + 1);
    const left = getTile(x - 1, y);
    const right = getTile(x + 1, y);

    // IMPORTANT: Include abilities in state. 
    // The environment behaves differently if you can swim or fly.
    const ab = `${abilities.swim ? 1 : 0}${abilities.jump ? 1 : 0}${abilities.fireResist ? 1 : 0}`;

    return `${up}:${down}:${left}:${right}:${ab}`;
  }

  public chooseAction(agent: AgentState, world: WorldState): RLAction {
    const stateKey = this.getStateKey(agent, world);

    // Initialize state if new
    if (!this.qTable[stateKey]) {
      this.qTable[stateKey] = Array(ACTIONS.length).fill(0);
    }

    // Epsilon-greedy strategy
    if (Math.random() < this.epsilon) {
      return ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
    }

    const qValues = this.qTable[stateKey];
    const maxQ = Math.max(...qValues);
    const bestIndices = qValues
      .map((q, i) => (q === maxQ ? i : -1))
      .filter((i) => i !== -1);
    
    const chosenIndex = bestIndices[Math.floor(Math.random() * bestIndices.length)];
    return ACTIONS[chosenIndex];
  }

  public learn(
    oldAgent: AgentState,
    world: WorldState,
    action: RLAction,
    reward: number,
    newAgent: AgentState
  ) {
    const oldStateKey = this.getStateKey(oldAgent, world);
    const newStateKey = this.getStateKey(newAgent, world);
    
    if (!this.qTable[newStateKey]) {
      this.qTable[newStateKey] = Array(ACTIONS.length).fill(0);
    }

    const actionIndex = ACTIONS.findIndex(a => a.name === action.name);
    const oldValue = this.qTable[oldStateKey][actionIndex];
    const maxFutureQ = Math.max(...this.qTable[newStateKey]);

    const newValue = oldValue + this.learningRate * (reward + this.discountFactor * maxFutureQ - oldValue);
    this.qTable[oldStateKey][actionIndex] = newValue;
  }
  
  public getQTableSize(): number {
    return Object.keys(this.qTable).length;
  }
}