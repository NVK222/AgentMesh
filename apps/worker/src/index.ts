import { db, MissionStatus } from "@agentmesh/shared";
import { Agent } from "./services/agent.service";
import "dotenv/config";

const agent = new Agent(process.env.GEMINI_API_KEY ?? "");

const poll = async () => {
  try {
    const mission = await db.mission.findFirst({
      where: {
        status: MissionStatus.PENDING,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (mission) {
      console.log(
        `Found mission: [${mission.id}] - Goal : ${mission.goal} - Starting execution ...`
      );
      await db.mission.update({
        where: {
          id: mission.id,
        },

        data: {
          status: MissionStatus.RUNNING,
        },
      });

      const response = await agent.execMission(mission.goal);
      console.log(response);
    }
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.error("Worker Error:  ", e.message);
    }
  } finally {
    setTimeout(poll, 5000);
  }
};

poll();
