import { db, MissionStatus } from "@agentmesh/shared";

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
