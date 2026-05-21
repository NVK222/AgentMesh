import { Queue } from "bullmq";
import Redis from "ioredis";

export const redis = new Redis();

export const missionQueue = new Queue("mission-queue");
