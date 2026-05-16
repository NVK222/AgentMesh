import { CreateMissionSchema, db } from "@agentmesh/shared";
import type { Request, Response } from "express";

export async function getMissions(req: Request, res: Response) {
    const missions = await db.mission.findMany();
    return res.status(200).json(missions);
}

export async function createMission(req: Request, res: Response) {
    const { goal } = CreateMissionSchema.parse(req.body);

    const result = await db.mission.create({
        data: {
            goal,
        },
    });

    return res.status(201).json(result);
}
