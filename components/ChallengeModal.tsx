import React, { useState } from 'react';
import { ChallengeProposal, GameGenre } from '../types';

interface Props {
  genre: GameGenre;
  level: number;
  proposal: ChallengeProposal;
  onAccept: () => void;
  onReject: () => void; // Retry
  onCustomize: (prompt: string) => void;
  isProcessing: boolean;
}

export const ChallengeModal: React.FC<Props> = ({ 
    genre, level, proposal, onAccept, onReject, onCustomize, isProcessing 
}) => {
  const [customPrompt, setCustomPrompt] = useState("");
  const [mode, setMode] = useState<'VIEW' | 'CUSTOM'>('VIEW');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
      <div className="bg-gray-900 border border-purple-500/50 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-gray-900 to-purple-900/40 border-b border-gray-800">
            <div className="flex justify-between items-center mb-2">
                <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold tracking-widest uppercase">
                    {genre} LEVEL {level} COMPLETED
                </span>
                <span className="text-gray-500 text-xs font-mono">GEMINI ARCHITECT</span>
            </div>
            <h2 className="text-3xl font-black text-white mb-1">{proposal.title}</h2>
            <p className="text-gray-400 text-sm">{proposal.description}</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
            {mode === 'VIEW' ? (
                <div className="space-y-2">
                    <div className="bg-gray-800/50 rounded p-4 border border-gray-700">
                        <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Proposed Changes</h3>
                        <ul className="text-sm space-y-1 font-mono text-green-400">
                            {proposal.patch.slice(0, 4).map((p, i) => (
                                <li key={i} className="truncate">
                                    <span className="text-gray-500">{p.op}</span> {p.path} <span className="text-gray-500">→</span> <span className="text-white">{String(p.value)}</span>
                                </li>
                            ))}
                            {proposal.patch.length > 4 && <li className="text-gray-600 italic">...and {proposal.patch.length - 4} more changes</li>}
                        </ul>
                    </div>
                </div>
            ) : (
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400">Custom Directive for Gemini:</label>
                    <textarea 
                        className="w-full bg-gray-800 border border-gray-600 rounded p-3 text-sm text-white focus:border-purple-500 outline-none"
                        rows={3}
                        placeholder="e.g. 'Make it ice themed', 'Add more walls'"
                        value={customPrompt}
                        onChange={e => setCustomPrompt(e.target.value)}
                    />
                </div>
            )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-950 flex gap-3 justify-end border-t border-gray-800">
             {isProcessing ? (
                 <span className="text-purple-400 animate-pulse font-mono text-sm self-center mr-auto">Processing...</span>
             ) : (
                 <>
                    {mode === 'VIEW' ? (
                        <>
                            <button onClick={onReject} className="px-4 py-2 text-gray-400 hover:text-white text-sm font-bold transition-colors">
                                REGENERATE
                            </button>
                            <button onClick={() => setMode('CUSTOM')} className="px-4 py-2 text-purple-400 hover:text-purple-300 text-sm font-bold transition-colors">
                                CUSTOMIZE
                            </button>
                            <button onClick={onAccept} className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded shadow-lg transition-transform hover:scale-105 active:scale-95">
                                ACCEPT CHALLENGE
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => setMode('VIEW')} className="px-4 py-2 text-gray-400 hover:text-white text-sm font-bold">CANCEL</button>
                            <button onClick={() => onCustomize(customPrompt)} className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded">
                                SUBMIT REQUEST
                            </button>
                        </>
                    )}
                 </>
             )}
        </div>

      </div>
    </div>
  );
};
