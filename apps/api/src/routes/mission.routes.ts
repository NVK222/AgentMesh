import { Router } from "express";
import { createMission, getMissions } from "../controllers/mission.controller";
import asyncHandler from "../utils/asyncHandler";

const missionRouter = Router();
missionRouter.get("/", asyncHandler(getMissions));
missionRouter.post("/", asyncHandler(createMission));

export default missionRouter;
