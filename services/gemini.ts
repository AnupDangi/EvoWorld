import { GoogleGenAI, Type } from "@google/genai";
import { ChallengeProposal, GameGenre } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const MODEL = "gemini-3-pro-preview";

const SYS_PROMPT = `
You are the Level Designer for EvoUniverse.
Your job is to create the NEXT LEVEL for a game.
Input: Current Game State + Current Level Number.
Output: A JSON Patch to make the game HARDER or DIFFERENT.
Title: Give the level a cool name.
Description: Explain what changed (e.g. "Added lava", "Increased gravity").
Constraints:
- Use standard JSON Patch (add, replace, remove).
- Do NOT make it impossible.
- Maze: Change grid, add hazards.
- Flappy: Change gravity, gapSize, speed.
- Runner: Change speed, spawnRate, lanes.
`;

export const proposeChallenge = async (
  genre: GameGenre,
  currentLevel: number,
  gameState: any,
  userOverride?: string
): Promise<ChallengeProposal> => {

  const prompt = `
  GENRE: ${genre}
  CURRENT LEVEL: ${currentLevel}
  NEXT LEVEL: ${currentLevel + 1}
  
  CURRENT STATE: ${JSON.stringify(gameState).slice(0, 2000)}

  INSTRUCTION: ${userOverride || `Create Level ${currentLevel + 1}. Increase difficulty significantly.`}
  
  Return JSON with { title, description, patch }.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        systemInstruction: SYS_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            patch: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                    op: { type: Type.STRING, enum: ["add", "replace", "remove"] },
                    path: { type: Type.STRING },
                    value: { type: Type.STRING } 
                },
                required: ["op", "path"]
              }
            }
          },
          required: ["title", "description", "patch"]
        }
      }
    });

    if (!response.text) throw new Error("No response");
    
    const res = JSON.parse(response.text);
    // Type fix for numbers in patch values
    res.patch.forEach((p: any) => {
        if (!isNaN(Number(p.value)) && typeof p.value === 'string') {
            p.value = Number(p.value);
        }
    });
    return res;

  } catch (e) {
    console.error(e);
    return {
        title: "Error Generating Level",
        description: "Gemini failed to respond. Try again.",
        patch: []
    };
  }
};

export const createMasterWorld = async (
    maze: any, flappy: any, runner: any
): Promise<ChallengeProposal> => {
    // Similar logic but for merging worlds if needed, or just standard proposal
    // For simplicity, we reuse the proposal structure
    return proposeChallenge('MASTER', 1, { maze, flappy, runner }, "Create the ULTIMATE FINAL BOSS LEVEL mixing all 3 mechanics.");
};
