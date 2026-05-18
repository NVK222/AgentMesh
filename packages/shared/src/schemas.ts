import * as z from "zod";
import { TaskType } from "./generated/client/enums";

export const CreateMissionSchema = z.object({
    goal: z
        .string("Please tell what the agent should do!")
        .min(1, "The goal cannot be empty"),
});

export const AgentMissionExecResultSchema = z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    order: z.number().int().positive(),
    type: z.enum(TaskType).catch(TaskType.CODE),
    inputContext: z.json(),
    dependsOn: z.array(z.number().int().positive()),
});

export type CreateMissionInput = z.infer<typeof CreateMissionSchema>;
export type AgentMissionExecResult = z.infer<
    typeof AgentMissionExecResultSchema
>;
export const AgentMissionExecResultArray = z.array(
    AgentMissionExecResultSchema
);
