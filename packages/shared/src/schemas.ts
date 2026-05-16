import * as z from "zod";

export const CreateMissionSchema = z.object({
    goal: z
        .string("Please tell what the agent should do!")
        .min(1, "The goal cannot be empty"),
});

export type CreateMissionInput = z.infer<typeof CreateMissionSchema>;
