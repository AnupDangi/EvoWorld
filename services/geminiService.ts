import { GoogleGenAI, Type } from "@google/genai";
import { WorldState, EvolutionResponse } from '../types';

// Use the robust Gemini 3 Pro model for complex reasoning
const MODEL_NAME = "gemini-3-pro-preview";
const THINKING_BUDGET = 32768; // Max budget for deep reasoning

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const EVOLUTION_SYSTEM_PROMPT = `
You are the World Brain for EvoWorld, a 2D grid-based simulation. 
Your goal is to evolve the world based on the current state and a user command.

WORLD PHYSICS & ABILITIES:
The agent has abilities you can toggle: { swim: bool, jump: bool, fireResist: bool }.
- **Water**: Blocks movement UNLESS 'swim' is true.
- **Lava**: Deals damage UNLESS 'fireResist' is true.
- **Wall/Mountain**: Blocks movement UNLESS 'jump' is true (climbing).
- **Treasure**: Grants points.

YOUR CAPABILITIES:
You MUST return a JSON object with a 'patch' array and 'log'.
1. You can modify the grid (change tiles).
2. You can modify the agent's abilities (grant 'swim', 'jump', etc. in /agent/abilities if requested or needed).
3. You can add/modify rules.

CONSTRAINTS:
1. Do not create impossible states.
2. Use standard JSON Patch operations: "add", "replace", "remove".
3. Valid tiles: "empty", "wall", "water", "lava", "treasure", "forest", "ice", "mountain".
4. Limit changes to a maximum of 15 operations per request.
5. If the user asks for something dangerous (e.g., "kill agent"), find a creative interpretation or refuse safely.
6. CREATE PUZZLES! E.g., surround treasure with lava but give the agent fireResist later, or make them learn to avoid it first.

Response Schema:
{
  "patch": [
    { "op": "replace", "path": "/grid/5/5", "value": "water" },
    ...
  ],
  "log": "Explanation of what changed."
}
`;

export const evolveWorld = async (
  currentWorld: WorldState,
  userCommand: string
): Promise<EvolutionResponse> => {
  try {
    const prompt = `
    CURRENT WORLD STATE:
    ${JSON.stringify(currentWorld)}

    USER COMMAND:
    "${userCommand || "Evolve the world naturally. Make it interesting."}"

    Generate the evolution patch.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: EVOLUTION_SYSTEM_PROMPT,
        thinkingConfig: { thinkingBudget: THINKING_BUDGET },
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
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
                },
                log: { type: Type.STRING }
            },
            required: ["patch", "log"]
        }
      }
    });

    if (!response.text) {
        throw new Error("No response from Gemini");
    }

    const result = JSON.parse(response.text) as EvolutionResponse;
    return result;

  } catch (error) {
    console.error("Gemini Evolution Error:", error);
    return {
      patch: [],
      log: `Evolution failed: ${error instanceof Error ? error.message : "Unknown error"}`
    };
  }
};