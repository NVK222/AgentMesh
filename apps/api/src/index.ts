import { db, MissionStatus } from "@agentmesh/shared";

const testInsert = async () => {
  try {
    const mission = await db.mission.create({
      data: {
        goal: "Fix this typo.",
        status: MissionStatus.PENDING,
      },
    });
    console.log(mission);
  } catch (e) {
    console.error("Database write failed :  ", e);
  }
};

testInsert();
