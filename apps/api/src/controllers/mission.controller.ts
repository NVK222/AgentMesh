import { CreateMissionSchema, db } from "@agentmesh/shared";
import type { Request, Response } from "express";
import * as z from "zod";

export async function getMissions(req: Request, res: Response) {
  const missions = await db.mission.findMany();
  return res.status(200).json(missions);
}

export async function createMission(req: Request, res: Response) {
  try {
    const zresult = CreateMissionSchema.safeParse(req.body);

    if (!zresult.success) {
      console.error(z.prettifyError(zresult.error));
      return res
        .status(400)
        .json({ error: "Goal must be atleast 1 characters long!" });
    }

    const { goal } = zresult.data;

    const result = await db.mission.create({
      data: {
        goal,
      },
    });

    return res.status(201).json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error occured!";
    console.error(message);
    return res.status(500).json({ message: message });
  }
}
