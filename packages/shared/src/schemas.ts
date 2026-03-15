import * as z from "zod";

export const CreateMissionSchema = z.object({
  goal: z.string().min(1),
});

export type CreateMissionInput = z.infer<typeof CreateMissionSchema>;
