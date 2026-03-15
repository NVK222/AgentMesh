import { db, MissionStatus } from "@agentmesh/shared";
import type { Request, Response } from "express";

export async function getMissions(req: Request, res: Response) {
  const missions = await db.mission.findMany();
  return res.status(200).json(missions);
}

export async function createMission(req: Request, res: Response) {
  try {
    const { goal } = req.body;

    if (!goal) {
      return res.status(400).json({
        error: "No goal",
      });
    }
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
