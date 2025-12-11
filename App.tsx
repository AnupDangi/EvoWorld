import React, { useState, useEffect, useRef } from 'react';
import { WorldCanvas } from './components/WorldCanvas';
import { ChallengeModal } from './components/ChallengeModal';
import { GameGenre, LogEntry, PatchOperation, LevelProgress, ChallengeProposal } from './types';
import { 
  initMaze, stepMaze, MAZE_ACTIONS, 
  initFlappy, stepFlappy, FLAPPY_ACTIONS, 
  initRunner, stepRunner, RUNNER_ACTIONS 
} from './services/engines';
import { RLAgent, encodeMaze, encodeFlappy, encodeRunner } from './services/agents';
import { proposeChallenge, createMasterWorld } from './services/gemini';
import { scheduler } from './services/scheduler';
import { applyPatch, Operation } from 'fast-json-patch';

export default function App() {
  // --- REFS (Mutable Game State) ---
  const mazeState = useRef(initMaze());
  const flappyState = useRef(initFlappy());
  const runnerState = useRef(initRunner());
  const masterState = useRef({ mode: 'MAZE', maze: initMaze(), flappy: initFlappy(), runner: initRunner(), score: 0, timer: 0 });

  const mazeAgent = useRef(new RLAgent(MAZE_ACTIONS));
  const flappyAgent = useRef(new RLAgent(FLAPPY_ACTIONS));
  const runnerAgent = useRef(new RLAgent(RUNNER_ACTIONS));
  const masterBrain = useRef({ maze: new RLAgent(MAZE_ACTIONS), flappy: new RLAgent(FLAPPY_ACTIONS), runner: new RLAgent(RUNNER_ACTIONS) });

  // --- REACT STATE ---
  const [tick, setTick] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeProposal, setActiveProposal] = useState<{ genre: GameGenre, proposal: ChallengeProposal } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Level Management
  const [levels, setLevels] = useState<Record<GameGenre, LevelProgress>>({
      MAZE: { current: 1, max: 4, status: 'TRAINING', winsRequired: 3, winsCurrent: 0 },
      FLAPPY: { current: 1, max: 4, status: 'TRAINING', winsRequired: 5, winsCurrent: 0 },
      RUNNER: { current: 1, max: 4, status: 'TRAINING', winsRequired: 5, winsCurrent: 0 },
      MASTER: { current: 0, max: 1, status: 'TRAINING', winsRequired: 999, winsCurrent: 0 }
  });

  const addLog = (genre: GameGenre, source: LogEntry['source'], message: string) => {
    setLogs(prev => [{ id: Math.random().toString(36), timestamp: new Date().toLocaleTimeString(), genre, source, message }, ...prev].slice(0, 20));
  };

  // --- 1. THE GAME LOOP (Pure JS, NO Gemini) ---
  useEffect(() => {
    const loop = setInterval(() => {
        
        // --- MAZE ---
        if (levels.MAZE.status === 'TRAINING') {
            const s = mazeState.current;
            const enc = encodeMaze(s);
            const action = mazeAgent.current.chooseAction(enc);
            const next = stepMaze(s, action);
            
            // RL Learn
            const reward = next.agent.score - s.agent.score;
            mazeAgent.current.learn(enc, action, reward, encodeMaze(next));
            mazeState.current = next;

            // Check Win
            if (next.grid[next.agent.y][next.agent.x] === 'goal') {
                if (scheduler.checkCompletion('MAZE', levels.MAZE, 'WIN')) {
                    handleLevelComplete('MAZE');
                }
            }
        }

        // --- FLAPPY ---
        if (levels.FLAPPY.status === 'TRAINING') {
            const s = flappyState.current;
            const enc = encodeFlappy(s);
            const action = flappyAgent.current.chooseAction(enc);
            const next = stepFlappy(s, action);
            const reward = next.agent.score - s.agent.score;
            flappyAgent.current.learn(enc, action, reward, encodeFlappy(next));
            flappyState.current = next;

            // Check "Score Chunk" (every 50 points ~ 5 pipes)
            if (Math.floor(next.agent.score / 50) > Math.floor(s.agent.score / 50)) {
                 if (scheduler.checkCompletion('FLAPPY', levels.FLAPPY, 'SCORE_CHUNK')) {
                    handleLevelComplete('FLAPPY');
                 }
            }
        }

        // --- RUNNER ---
        if (levels.RUNNER.status === 'TRAINING') {
            const s = runnerState.current;
            const enc = encodeRunner(s);
            const action = runnerAgent.current.chooseAction(enc);
            const next = stepRunner(s, action);
            const reward = next.agent.score - s.agent.score;
            runnerAgent.current.learn(enc, action, reward, encodeRunner(next));
            runnerState.current = next;

            if (Math.floor(next.agent.score / 100) > Math.floor(s.agent.score / 100)) {
                if (scheduler.checkCompletion('RUNNER', levels.RUNNER, 'SCORE_CHUNK')) {
                    handleLevelComplete('RUNNER');
                }
            }
        }

        // --- MASTER ---
        // (Master runs only if all others finished)
        const allFinished = levels.MAZE.status === 'FINISHED' && levels.FLAPPY.status === 'FINISHED' && levels.RUNNER.status === 'FINISHED';
        if (allFinished && levels.MASTER.status === 'TRAINING') {
             // ... Master Loop Logic (omitted for brevity, essentially same as before) ...
        }

        setTick(t => t + 1);
    }, 30);
    return () => clearInterval(loop);
  }, [levels]); // Re-bind when levels change status

  // --- 2. EVENT HANDLERS ---

  const handleLevelComplete = async (genre: GameGenre) => {
      // 1. Pause Training
      setLevels(prev => ({
          ...prev,
          [genre]: { ...prev[genre], status: 'PROPOSING' }
      }));
      addLog(genre, 'SYSTEM', `Level ${levels[genre].current} Completed! requesting Architect...`);

      // 2. Call Gemini (Async)
      await fetchProposal(genre, levels[genre].current);
  };

  const fetchProposal = async (genre: GameGenre, level: number, customPrompt?: string) => {
      setIsProcessing(true);
      let state = null;
      if (genre === 'MAZE') state = mazeState.current;
      if (genre === 'FLAPPY') state = flappyState.current;
      if (genre === 'RUNNER') state = runnerState.current;

      const proposal = await proposeChallenge(genre, level, state, customPrompt);
      
      setActiveProposal({ genre, proposal });
      setLevels(prev => ({ ...prev, [genre]: { ...prev[genre], status: 'WAITING_FOR_APPROVAL' } }));
      setIsProcessing(false);
  };

  const handleAcceptProposal = () => {
      if (!activeProposal) return;
      const { genre, proposal } = activeProposal;

      // 1. Apply Patch
      let target = null;
      if (genre === 'MAZE') target = mazeState.current;
      if (genre === 'FLAPPY') target = flappyState.current;
      if (genre === 'RUNNER') target = runnerState.current;
      
      if (target) {
          applyPatch(target, proposal.patch as Operation[], false, true);
          addLog(genre, 'GEMINI', `Applied: ${proposal.title}`);
      }

      // 2. Advance Level
      setLevels(prev => {
          const nextLevel = prev[genre].current + 1;
          const isFinished = nextLevel > prev[genre].max;
          return {
              ...prev,
              [genre]: { 
                  ...prev[genre], 
                  current: nextLevel, 
                  status: isFinished ? 'FINISHED' : 'TRAINING',
                  winsCurrent: 0,
                  winsRequired: scheduler.getNextLevelReqs(nextLevel) // Scale up difficulty
              }
          };
      });

      // 3. Reset Agent Position (keep brain)
      // (Simplified: Agent usually resets on death/win in engine, but let's force a clean slate for new level)
      if (genre === 'MAZE') mazeState.current = initMaze(mazeState.current.width, mazeState.current.height);
      // Note: we kept the grid size from the patch, just reset agent vars
      
      setActiveProposal(null);
  };

  const handleRejectProposal = () => {
      if (!activeProposal) return;
      fetchProposal(activeProposal.genre, levels[activeProposal.genre].current, "Try something different. That was rejected.");
  };

  const handleCustomizeProposal = (prompt: string) => {
      if (!activeProposal) return;
      fetchProposal(activeProposal.genre, levels[activeProposal.genre].current, prompt);
  };

  // --- RENDER ---
  return (
    <div className="h-screen w-screen bg-gray-950 text-white flex flex-col font-sans overflow-hidden">
      
      {/* Modal */}
      {activeProposal && (
          <ChallengeModal 
            genre={activeProposal.genre}
            level={levels[activeProposal.genre].current}
            proposal={activeProposal.proposal}
            onAccept={handleAcceptProposal}
            onReject={handleRejectProposal}
            onCustomize={handleCustomizeProposal}
            isProcessing={isProcessing}
          />
      )}

      {/* Header */}
      <header className="flex justify-between items-center px-6 py-4 bg-gray-900 border-b border-gray-800">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                EvoUniverse
            </h1>
            <span className="text-gray-500 text-sm border-l border-gray-700 pl-4">
                Quota-Safe Architecture
            </span>
          </div>
          <div className="text-xs text-gray-500 font-mono">
              Events: {logs.length} | Ticks: {tick}
          </div>
      </header>

      {/* Grid */}
      <main className="flex-1 p-4 grid grid-cols-3 gap-4">
          
          {/* Maze Card */}
          <div className={`relative bg-gray-900 border ${levels.MAZE.status === 'FINISHED' ? 'border-green-500' : 'border-gray-800'} rounded-xl overflow-hidden flex flex-col`}>
              <div className="p-3 bg-gray-800 flex justify-between items-center">
                  <span className="font-bold text-green-400">MAZE WORLD</span>
                  <div className="flex gap-2 text-xs font-mono">
                      <span>Lvl {levels.MAZE.current}/{levels.MAZE.max}</span>
                      <span className={levels.MAZE.status === 'TRAINING' ? 'text-green-500 animate-pulse' : 'text-yellow-500'}>
                          {levels.MAZE.status}
                      </span>
                  </div>
              </div>
              <div className="flex-1 relative">
                  <WorldCanvas genre="MAZE" state={mazeState.current} />
                  {/* Progress Bar Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800">
                      <div 
                        className="h-full bg-green-500 transition-all duration-300" 
                        style={{ width: `${Math.min(100, (levels.MAZE.winsCurrent / levels.MAZE.winsRequired) * 100)}%` }}
                      />
                  </div>
              </div>
          </div>

          {/* Flappy Card */}
          <div className={`relative bg-gray-900 border ${levels.FLAPPY.status === 'FINISHED' ? 'border-yellow-500' : 'border-gray-800'} rounded-xl overflow-hidden flex flex-col`}>
               <div className="p-3 bg-gray-800 flex justify-between items-center">
                  <span className="font-bold text-yellow-400">FLAPPY WORLD</span>
                  <div className="flex gap-2 text-xs font-mono">
                      <span>Lvl {levels.FLAPPY.current}/{levels.FLAPPY.max}</span>
                      <span className={levels.FLAPPY.status === 'TRAINING' ? 'text-green-500 animate-pulse' : 'text-yellow-500'}>
                          {levels.FLAPPY.status}
                      </span>
                  </div>
              </div>
              <div className="flex-1 relative">
                  <WorldCanvas genre="FLAPPY" state={flappyState.current} />
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800">
                      <div 
                        className="h-full bg-yellow-500 transition-all duration-300" 
                        style={{ width: `${Math.min(100, (levels.FLAPPY.winsCurrent / levels.FLAPPY.winsRequired) * 100)}%` }}
                      />
                  </div>
              </div>
          </div>

          {/* Runner Card */}
          <div className={`relative bg-gray-900 border ${levels.RUNNER.status === 'FINISHED' ? 'border-blue-500' : 'border-gray-800'} rounded-xl overflow-hidden flex flex-col`}>
               <div className="p-3 bg-gray-800 flex justify-between items-center">
                  <span className="font-bold text-blue-400">RUNNER WORLD</span>
                   <div className="flex gap-2 text-xs font-mono">
                      <span>Lvl {levels.RUNNER.current}/{levels.RUNNER.max}</span>
                      <span className={levels.RUNNER.status === 'TRAINING' ? 'text-green-500 animate-pulse' : 'text-yellow-500'}>
                          {levels.RUNNER.status}
                      </span>
                  </div>
              </div>
              <div className="flex-1 relative">
                  <WorldCanvas genre="RUNNER" state={runnerState.current} />
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-300" 
                        style={{ width: `${Math.min(100, (levels.RUNNER.winsCurrent / levels.RUNNER.winsRequired) * 100)}%` }}
                      />
                  </div>
              </div>
          </div>

      </main>
      
      {/* Log Footer */}
      <div className="h-32 bg-gray-900 border-t border-gray-800 p-2 overflow-y-auto font-mono text-[10px] space-y-1">
           {logs.map(l => (
                <div key={l.id} className="flex gap-2">
                    <span className="text-gray-500">[{l.timestamp}]</span>
                    <span className="font-bold text-gray-300 w-20">{l.source}</span>
                    <span className="text-gray-400">{l.message}</span>
                </div>
           ))}
      </div>
    </div>
  );
}
