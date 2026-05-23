import { Queue } from "bullmq";
import Redis from "ioredis";

const globalRedis = global as unknown as {
    redis: Redis;
};

export const redis =
    globalRedis.redis || new Redis({ maxRetriesPerRequest: null });
if (process.env.NODE_ENV !== "production") globalRedis.redis = redis;

export const missionQueue = new Queue("mission-queue", { connection: redis });
