import React, { useRef, useEffect } from 'react';
import { GameGenre } from '../types';

interface Props {
  genre: GameGenre;
  state: any; // Dynamic state
}

export const WorldCanvas: React.FC<Props> = ({ genre, state }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs || !state) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, cvs.width, cvs.height);

    // --- RENDER MAZE ---
    if (genre === 'MAZE' || (genre === 'MASTER' && state.mode === 'MAZE')) {
        const s = genre === 'MASTER' ? state.maze : state;
        const TILE = Math.min(cvs.width / s.width, cvs.height / s.height);
        
        for(let y=0; y<s.height; y++) {
            for(let x=0; x<s.width; x++) {
                const t = s.grid[y][x];
                ctx.fillStyle = t === 'wall' ? '#555' : t === 'hazard' ? '#500' : t==='goal' ? '#D4AF37' : '#222';
                ctx.fillRect(x*TILE, y*TILE, TILE, TILE);
                ctx.strokeStyle = '#333';
                ctx.strokeRect(x*TILE, y*TILE, TILE, TILE);
            }
        }
        // Agent
        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.arc(s.agent.x*TILE + TILE/2, s.agent.y*TILE + TILE/2, TILE/3, 0, Math.PI*2);
        ctx.fill();
    }

    // --- RENDER FLAPPY ---
    else if (genre === 'FLAPPY' || (genre === 'MASTER' && state.mode === 'FLAPPY')) {
        const s = genre === 'MASTER' ? state.flappy : state;
        // Background
        ctx.fillStyle = '#1e1b4b'; // Deep blue
        ctx.fillRect(0,0,cvs.width, cvs.height);
        
        // Pipes
        ctx.fillStyle = '#16a34a';
        s.pipes.forEach((p: any) => {
            // Top pipe
            ctx.fillRect(p.x, 0, 40, p.gapY - p.gapSize/2);
            // Bottom pipe
            ctx.fillRect(p.x, p.gapY + p.gapSize/2, 40, cvs.height);
        });

        // Agent
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(30, s.agent.y, 10, 0, Math.PI*2); // Agent visual x fixed at 30 usually, logical x in engine might differ but engine uses moving pipes
        ctx.fill();
        
        // Ground
        ctx.fillStyle = '#57534e';
        ctx.fillRect(0, cvs.height-10, cvs.width, 10);
    }

    // --- RENDER RUNNER ---
    else if (genre === 'RUNNER' || (genre === 'MASTER' && state.mode === 'RUNNER')) {
        const s = genre === 'MASTER' ? state.runner : state;
        const LANE_W = cvs.width / s.lanes;
        
        // Lanes
        ctx.strokeStyle = '#444';
        for(let i=0; i<=s.lanes; i++) {
            ctx.beginPath(); ctx.moveTo(i*LANE_W, 0); ctx.lineTo(i*LANE_W, cvs.height); ctx.stroke();
        }

        // Obstacles
        s.obstacles.forEach((o: any) => {
            const screenY = (o.y / s.length) * cvs.height;
            ctx.fillStyle = o.type === 'rock' ? '#ef4444' : '#fbbf24';
            ctx.beginPath();
            ctx.arc(o.lane*LANE_W + LANE_W/2, screenY, 15, 0, Math.PI*2);
            ctx.fill();
            if(o.type==='rock') {
                ctx.fillStyle = '#000';
                ctx.fillText('Rock', o.lane*LANE_W + LANE_W/2 - 10, screenY);
            }
        });

        // Agent
        const agentScreenY = ((s.length - 40) / s.length) * cvs.height;
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(s.agent.lane*LANE_W + 10, agentScreenY, LANE_W - 20, 30);
    }
  }, [genre, state]);

  return (
    <div className="relative border border-gray-600 rounded overflow-hidden h-full">
      <canvas 
        ref={canvasRef} 
        width={300} 
        height={300} 
        className="w-full h-full object-cover"
      />
      <div className="absolute top-2 left-2 bg-black/50 px-2 py-1 rounded text-xs text-white font-mono">
        {genre === 'MASTER' ? `MASTER (${state?.mode})` : genre}
      </div>
      <div className="absolute bottom-2 right-2 text-xs font-bold">
        Score: {Math.floor(genre === 'MASTER' ? state?.score : state?.agent?.score || 0)}
      </div>
    </div>
  );
};
