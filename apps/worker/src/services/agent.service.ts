import { GoogleGenAI } from "@google/genai";

export class Agent {
  private genAi: GoogleGenAI;

  constructor(api_key: string) {
    this.genAi = new GoogleGenAI({ apiKey: api_key });
  }

  async execMission(goal: string) {
    const prompt = `
      Your mission is: "${goal}".
Return only the array.
    `;

    const response = await this.genAi.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: `You are the AgentMesh Brain, a High-Level Systems Architect.
  Your job is to decompose a complex mission into a logical, sequential JSON array of tasks.

  RULES:
  1. Output ONLY a raw JSON array. No markdown, no backticks, no prose.
  2. Schema: { "title": string, "description": string, "order": number, "type": "CODE" | "RESEARCH" | "REVIEW" | "DEPLOY", inputContext: JSON (optional) }
  3. Context: Each description MUST be self-contained. The sub-agent reading it won't see the original mission goal.
  4. Sequence: Orders must be strictly incrementing (1, 2, 3...).
  5. Each step should include an inputContext (JSON object) for any specific technical parameters, constants, or reference URLs needed for that specific step.`,
      },
    });

    return response.text;
  }

  async execTask(taskDesc: string, history: string, missionGoal: string) {
    const prompt = `
    OVERALL MISSION GOAL: ${missionGoal}

    HISTORY OF COMPLETED STEPS:
    ${history}

    CURRENT TASK TO EXECUTE:
    ${taskDesc}
`;

    const response = await this.genAi.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: `You are an autonomous Executor.
  You receive a history of work and a specific task.
  Your job is to output ONLY the direct result of the task.
  If the task asks for code, return only code. If it asks for a summary, return only the summary.
  NO conversational filler like "Here is the result" or "I have finished the task".`,
      },
    });

    return response.text;
  }
}
