import { GoogleGenAI } from "@google/genai";

export class Agent {
  private genAi: GoogleGenAI;

  constructor(api_key: string) {
    this.genAi = new GoogleGenAI({ apiKey: api_key });
  }

  async execMission(goal: string) {
    const prompt = `
      You are the AgentMesh Brain.
      Your mission is: "${goal}"

      Return only a JSON array of steps required to complete this mission.
      Each step SHOULD strictly follow the following schema with no renaming of keys: title, description, order
        title: A short imperative action,
        description: The instruction that contains all the details required for a sub-agent to finish this step without knowing the overall mission,
        order: A strictly incrementing integer starting from 1. This is required for the sequence of workflow.

      Here is an example:
        mission : "Make a sandwich"
        output : [{ "title" : "Get Bread", "description" : "Locate 2 slices of english bread ...", "order" : 1}, {"title" : "Get Veggies", "description" : "Locate vegetables usually included in a sandwich", "order" : 2}]


      Do not write prose.
      Do not write markdown code blocks (unless specified).
      Do not include any conversational text before or after the JSON.
    `;

    const response = await this.genAi.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text;
  }
}
