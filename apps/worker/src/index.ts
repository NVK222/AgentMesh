import "dotenv/config";
import "./services/queue.process.ts";
import { logger } from "./utils/logger";

logger.debug("Mission queue online.");
