import { Job, Worker } from "bullmq";
import { tryMission } from "./process";
import { redis } from "@agentmesh/shared";
import { logger } from "../utils/logger";

const worker = new Worker(
    "mission-queue",
    async (job: Job) => {
        const { missionId } = job.data;
        await tryMission(missionId);
    },
    { connection: redis }
);

worker.on("error", (err) => {
    logger.error(err.message);
});

worker.on("failed", (_, err) => {
    logger.error(err.message);
});
