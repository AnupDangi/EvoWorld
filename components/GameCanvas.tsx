import React, { useRef, useEffect } from 'react';
import { WorldState, AgentState, TileType } from '../types';
import { TILE_SIZE, TILE_COLORS } from '../constants';

interface GameCanvasProps {
  world: WorldState;
  agent: AgentState;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ world, agent }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Render Grid
    for (let y = 0; y < world.height; y++) {
      for (let x = 0; x < world.width; x++) {
        const tile = world.grid[y][x];
        const color = TILE_COLORS[tile] || '#333';
        
        ctx.fillStyle = color;
        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

        // Grid lines (subtle)
        ctx.strokeStyle = '#00000022';
        ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

        // Text/Emoji for special tiles
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const cx = x * TILE_SIZE + TILE_SIZE / 2;
        const cy = y * TILE_SIZE + TILE_SIZE / 2;
        
        if (tile === TileType.LAVA) {
          ctx.font = '24px Arial';
          ctx.fillText('🔥', cx, cy);
        } else if (tile === TileType.WATER) {
           ctx.font = '24px Arial';
           ctx.fillText('🌊', cx, cy);
        } else if (tile === TileType.TREASURE) {
            ctx.font = '24px Arial';
            ctx.fillText('💰', cx, cy);
        } else if (tile === TileType.FOREST) {
            ctx.font = '24px Arial';
            ctx.fillText('🌲', cx, cy);
        } else if (tile === TileType.MOUNTAIN) {
            ctx.font = '24px Arial';
            ctx.fillText('🏔️', cx, cy);
        } else if (tile === TileType.ICE) {
            ctx.font = '24px Arial';
            ctx.fillText('❄️', cx, cy);
        }
      }
    }

    // Render Objects
    world.objects.forEach(obj => {
       ctx.fillStyle = '#FFD700';
       ctx.beginPath();
       ctx.arc(obj.x * TILE_SIZE + TILE_SIZE/2, obj.y * TILE_SIZE + TILE_SIZE/2, TILE_SIZE/4, 0, Math.PI * 2);
       ctx.fill();
    });

    // --- Render Agent ---
    const agentPadding = 8;
    const ax = agent.x * TILE_SIZE + agentPadding;
    const ay = agent.y * TILE_SIZE + agentPadding;
    const as = TILE_SIZE - agentPadding * 2;

    // Agent Aura for abilities
    if (agent.abilities.fireResist) {
        ctx.shadowColor = 'red';
        ctx.shadowBlur = 15;
    } else if (agent.abilities.swim) {
        ctx.shadowColor = 'cyan';
        ctx.shadowBlur = 15;
    } else {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
    }

    ctx.fillStyle = '#4ade80'; // Agent Body
    ctx.beginPath();
    ctx.roundRect(ax, ay, as, as, 6);
    ctx.fill();
    ctx.shadowBlur = 0; // Reset shadow

    // Eyes
    ctx.fillStyle = '#000';
    ctx.fillRect(ax + 8, ay + 8, 4, 4);
    ctx.fillRect(ax + 20, ay + 8, 4, 4);

    // Ability Indicators (Visual cues on agent)
    if (agent.abilities.jump) {
        // Wings/Jump boots indicator
        ctx.fillStyle = '#fb923c'; // Orange
        ctx.beginPath();
        ctx.moveTo(ax - 4, ay + as / 2);
        ctx.lineTo(ax, ay + as / 2 - 4);
        ctx.lineTo(ax, ay + as / 2 + 4);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(ax + as + 4, ay + as / 2);
        ctx.lineTo(ax + as, ay + as / 2 - 4);
        ctx.lineTo(ax + as, ay + as / 2 + 4);
        ctx.fill();
    }

  }, [world, agent]);

  return (
    <div className="relative shadow-2xl rounded-lg overflow-hidden border-4 border-gray-700">
      <canvas
        ref={canvasRef}
        width={world.width * TILE_SIZE}
        height={world.height * TILE_SIZE}
        className="bg-gray-800"
      />
    </div>
  );
};