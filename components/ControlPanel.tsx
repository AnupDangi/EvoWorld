import React, { useState } from 'react';
import { LogEntry, AgentState } from '../types';

interface ControlPanelProps {
  logs: LogEntry[];
  agent: AgentState;
  onCommand: (cmd: string) => void;
  isProcessing: boolean;
  onToggleAuto: (enabled: boolean) => void;
  autoEvolve: boolean;
  generationCount: number;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ 
  logs, 
  agent, 
  onCommand, 
  isProcessing,
  onToggleAuto,
  autoEvolve,
  generationCount
}) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isProcessing) {
      onCommand(input.trim());
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-800 border-l border-gray-700 w-96 max-w-md">
      
      {/* Header Stats */}
      <div className="p-4 bg-gray-900 border-b border-gray-700">
        <h2 className="text-xl font-bold text-blue-400 mb-2">EvoWorld Control</h2>
        <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
          <div className="bg-gray-800 p-2 rounded">Gen: <span className="text-white font-mono">{generationCount}</span></div>
          <div className="bg-gray-800 p-2 rounded">Health: <span className="text-red-400 font-mono">{agent.health.toFixed(0)}</span></div>
          <div className="bg-gray-800 p-2 rounded col-span-2 flex justify-between">
            <span>Score: <span className="text-yellow-400 font-mono">{agent.score.toFixed(1)}</span></span>
            <span>Pos: <span className="text-green-400 font-mono">[{agent.x}, {agent.y}]</span></span>
          </div>
        </div>
        
        {/* Active Abilities Bar */}
        <div className="flex gap-1 mt-2">
            <span className={`px-2 py-0.5 text-xs rounded ${agent.abilities.swim ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-600 border border-gray-700'}`}>Swim</span>
            <span className={`px-2 py-0.5 text-xs rounded ${agent.abilities.jump ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-600 border border-gray-700'}`}>Jump</span>
            <span className={`px-2 py-0.5 text-xs rounded ${agent.abilities.fireResist ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-600 border border-gray-700'}`}>FireRes</span>
        </div>
      </div>

      {/* Log Console */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
        {logs.map((log) => (
          <div key={log.id} className={`p-2 rounded border-l-2 animate-fade-in ${
            log.source === 'GEMINI' ? 'border-purple-500 bg-purple-900/20' :
            log.source === 'USER' ? 'border-blue-500 bg-blue-900/20' :
            log.source === 'SYSTEM' ? 'border-gray-500 bg-gray-900/20' :
            'border-green-500 bg-green-900/20'
          }`}>
            <div className="flex justify-between text-gray-400 mb-1">
              <span className="font-bold">{log.source}</span>
              <span>{log.timestamp}</span>
            </div>
            <p className="text-gray-200 whitespace-pre-wrap">{log.message}</p>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-gray-900 border-t border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <label className="flex items-center space-x-2 cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={autoEvolve} 
              onChange={(e) => onToggleAuto(e.target.checked)}
              className="form-checkbox h-4 w-4 text-purple-600 rounded bg-gray-700 border-gray-600 focus:ring-purple-500" 
            />
            <span className="text-sm text-gray-300">Auto-Evolve World</span>
          </label>
          {isProcessing && <span className="text-purple-400 text-xs animate-pulse">Thinking...</span>}
        </div>
        
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isProcessing}
            placeholder="E.g. 'Give agent fire resistance'"
            className="w-full bg-gray-800 border border-gray-600 rounded-lg py-2 px-4 pr-10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          />
          <button 
            type="submit" 
            disabled={!input.trim() || isProcessing}
            className="absolute right-2 top-2 text-blue-400 hover:text-blue-300 disabled:text-gray-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};