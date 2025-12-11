import { GameGenre, LevelProgress } from '../types';

// Criteria for completing a level
const WINS_REQ_MAZE = 3;   // Reach goal 3 times
const WINS_REQ_FLAPPY = 5; // Pass 5 pipes cumulative (or single run, simplified to cumulative score chunks)
const WINS_REQ_RUNNER = 5; // Collect 5 coins or survive duration chunks

export class LevelScheduler {
  
  // Check if agent met the criteria to finish the current level
  public checkCompletion(genre: GameGenre, progress: LevelProgress, event: 'WIN' | 'SCORE_CHUNK'): boolean {
    if (progress.status !== 'TRAINING') return false;

    if (genre === 'MAZE' && event === 'WIN') {
        progress.winsCurrent++;
    } else if (genre === 'FLAPPY' && event === 'SCORE_CHUNK') {
        progress.winsCurrent++;
    } else if (genre === 'RUNNER' && event === 'SCORE_CHUNK') {
        progress.winsCurrent++;
    }

    // Did we beat the level?
    if (progress.winsCurrent >= progress.winsRequired) {
        return true;
    }
    return false;
  }

  public getNextLevelReqs(level: number): number {
      // Scale difficulty/requirements
      return 3 + level; 
  }
}

export const scheduler = new LevelScheduler();
