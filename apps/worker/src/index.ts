import { db, MissionStatus, TaskStatus, TaskType } from "@agentmesh/shared";
import { Agent } from "./services/agent.service";
import "dotenv/config";
import type { Task } from "packages/shared/src/generated/client/client";

const agent = new Agent(process.env.GEMINI_API_KEY ?? "");

const poll = async () => {
  try {
    const completedTask = await tryTask();
    if (!completedTask) {
      await tryMission();
    }
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.error("Worker Error:  ", e.message);
    }
  } finally {
    setTimeout(poll, 5000);
  }
};

const tryTask = async () => {
  const task = await db.task.findFirst({
    where: {
      status: TaskStatus.WAITING,
      mission: {
        status: MissionStatus.RUNNING,
      },
    },
    orderBy: {
      order: "asc",
    },

    include: {
      mission: true,
    },
  });
  if (task) {
    await db.task.update({
      where: {
        id: task.id,
      },
      data: {
        status: TaskStatus.ACTIVE,
      },
    });
    console.log(
      `Found task: [${task.id}] - Goal : ${task.description} - Starting execution ...`
    );

    //TODO: Implement dumb agent
    console.log("Task completed.");

    await db.task.update({
      where: {
        id: task.id,
      },

      data: {
        status: TaskStatus.COMPLETED,
      },
    });

    const count = await db.task.count({
      where: {
        missionId: task.missionId,
        status: {
          not: TaskStatus.COMPLETED,
        },
      },
    });

    if (count === 0) {
      await db.mission.update({
        where: {
          id: task.missionId,
        },
        data: {
          status: MissionStatus.COMPLETED,
        },
      });
    }

    return task;
  }
  return null;
};

const tryMission = async () => {
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

    if (!response) {
      console.error("No response");
      return;
    }

    // Clean response using regex
    const regex = /\[[\s\S]*\]/;
    const clean_response = regex.exec(response);

    if (!clean_response) {
      await db.mission.update({
        where: {
          id: mission.id,
        },
        data: {
          status: MissionStatus.FAILED,
        },
      });
      console.log("Invalid response");
      return;
    }

    console.log(clean_response[0]);
    // Parse json

    try {
      const parsed_res: Array<Task> = JSON.parse(clean_response[0]);
      let newTasks = [];

      parsed_res.map((currTask) => {
        newTasks.push({
          title: currTask.title,
          description: currTask.description,
          order: currTask.order,
          missionId: mission.id,
          type: TaskType.CODE,
          status: TaskStatus.WAITING,
          inputContext: currTask.inputContext ?? {},
        });
      });

      await db.task.createMany({
        data: newTasks,
      });
    } catch (e: unknown) {
      if (e instanceof SyntaxError) {
        console.log("Error parsing the response to JSON");
        await db.mission.update({
          where: {
            id: mission.id,
          },
          data: {
            status: MissionStatus.FAILED,
          },
        });
      }
    }
  }
};

poll();
