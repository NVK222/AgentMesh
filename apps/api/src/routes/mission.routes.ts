import { Router } from "express";
import { createMission, getMissions } from "../controllers/mission.controller";

const missionRouter = Router();
missionRouter.get("/", getMissions);
missionRouter.post("/", createMission);

export default missionRouter;
