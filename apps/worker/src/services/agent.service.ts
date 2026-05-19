import { GoogleGenAI } from "@google/genai";

const execMissionOutputSchema = {
    type: "ARRAY",
    items: {
        type: "OBJECT",
        properties: {
            title: { title: "Title of the task", type: "STRING" },
            description: {
                title: "A description about the task",
                description:
                    "Each description MUST be self-contained. The sub-agent reading it won't see the original mission goal.",
                type: "STRING",
            },
            order: {
                title: "Order number of the task",
                description:
                    "A strictly increasing number starting from 1 that determines the order of the task",
                type: "INTEGER",
                minimum: 1,
            },
            type: {
                title: "Type of task",
                type: "STRING",
                enum: ["RESEARCH", "CODE", "REVIEW", "DEPLOY"],
            },
            inputContext: {
                title: "Input context needed for completing the task",
                description:
                    "A JSON Object storing key-value pairs of technical parameters (e.g., {'language': 'python', 'target_framework': 'flask'}) that are required for the specific task. If no specific context is needed, return an empty object {}.",
                type: "OBJECT",
            },
            dependsOn: {
                title: "An array of order numbers that the task depends on.",
                type: "ARRAY",
                items: { type: "INTEGER" },
            },
        },
        required: [
            "title",
            "description",
            "order",
            "type",
            "inputContext",
            "dependsOn",
        ],
    },
};

export class Agent {
    private genAi: GoogleGenAI;
    private model: string;

    constructor(api_key: string, model: string) {
        this.genAi = new GoogleGenAI({ apiKey: api_key });
        this.model = model;
    }

    async execMission(goal: string) {
        const prompt = `
      Your mission is: "${goal}".
Return only the array.
    `;

        const response = await this.genAi.models.generateContent({
            model: this.model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: execMissionOutputSchema,
                systemInstruction: `You are the AgentMesh Brain, a High-Level Systems Architect.
Your job is to decompose a complex mission into a lean, highly parallel, optimized JSON array of tasks.
RULES:
1. **Maximize Concurrency**: Actively design the plan to run tasks in parallel. If two steps do not directly depend on each other's outputs (e.g., researching apattern vs. drafting a file signature, or writing test cases vs. writing documentation), they must have zero overlapping entries in their dependsOn arrays so they can execute at the exact same time."
2. **Enforce Macro-Tasking:** Avoid micro-tasking. Do not create separate tasks for setup, signatures, research, or small increments. Every task must represent a "Minimum Unit of Value"—an atomic, functional milestone that can be written and verified as a cohesive block.
3. **Consolidate Code & Design:** Never separate the "design/signature" of a function from its "implementation." They must be a single task.
4. **Consolidate Research:** Research and structural planning should be grouped into the first coding task or handled as a single overarching prerequisite step only if the mission is massively complex.
5. **Task Count Guidance:**
   - For simple requests (e.g., single functions, basic scripts, decorators): Limit the graph to a maximum of 2-3 tasks (e.g., 1. Research/Implement, 2. Test/Review).
   - For medium requests (e.g., multiple modules, API setups): 4-5 tasks.`,
            },
        });

        return response.text;
    }

    async execTask(taskDesc: string, history: string, missionGoal: string) {
        const prompt = `OVERALL MISSION GOAL: ${missionGoal}

HISTORY OF COMPLETED STEPS:
${history}

CURRENT TASK TO EXECUTE: ${taskDesc}
`;

        const response = await this.genAi.models.generateContent({
            model: this.model,
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
