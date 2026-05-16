import { db, MissionStatus, TaskStatus, TaskType } from "@agentmesh/shared";
import { Agent } from "./services/agent.service";
import "dotenv/config";
import type { Task } from "packages/shared/src/generated/client/client";
import type { InputJsonValue } from "packages/shared/src/generated/client/internal/prismaNamespace";

const agent = new Agent(process.env.GEMINI_API_KEY ?? "");
const NUM_TASKS_IN_HISTORY = 5;

interface CreateTask {
    missionId: string;
    type: TaskType;
    status: TaskStatus;
    title: string;
    description: string;
    order: number;
    inputContext: InputJsonValue;
}

interface ModelResponse extends Task {
    dependsOn: Array<number>;
}

const poll = async () => {
    try {
        if (!(await tryTasks())) {
            await tryMission();
        }
    } catch (e: unknown) {
        if (e instanceof Error) {
            console.error(e.message);
        }
    } finally {
        setTimeout(poll, 5000);
    }
};

const tryTasks = async () => {
    // Get all tasks whose dependencies have been fulfilled
    const readyTasks = await db.task.findMany({
        where: {
            status: TaskStatus.WAITING,
            mission: { status: MissionStatus.RUNNING },
            dependencies: { none: { status: { not: TaskStatus.COMPLETED } } },
        },
        orderBy: { order: "asc" },
        include: { mission: true, dependencies: true },
    });

    if (readyTasks.length === 0) return null;
    console.log(
        `[ORCHESTRATOR] found ${readyTasks.length} tasks. Running in parallel`
    );

    const missionId = readyTasks.at(0)?.missionId;

    const promises = readyTasks.map(async (task) => {
        //Update their status to active
        await db.task.update({
            where: { id: task.id },
            data: { status: TaskStatus.ACTIVE },
        });

        try {
            //Create a history string for the agent
            const history = task.dependencies.slice(-NUM_TASKS_IN_HISTORY);
            let historyString = `#Previous Work Done:\n`;
            history.forEach((currTask) => {
                historyString += `###Task: ${currTask.title} | ###Result: ${currTask.outputResult?.toString()}\n`;
            });

            const agentResponse = await agent.execTask(
                task.description,
                historyString,
                task.mission.goal
            );
            if (!agentResponse || agentResponse.includes('"error":'))
                throw new Error("Worker Agent task failed.");

            await db.task.update({
                where: { id: task.id },
                data: {
                    status: TaskStatus.COMPLETED,
                    outputResult: agentResponse,
                },
            });
        } catch (e) {
            // If any task fails, immediately sets the task and its mission to FAILED
            await db.task.update({
                where: { id: task.id },
                data: { status: TaskStatus.FAILED },
            });
            await db.mission.update({
                where: { id: task.mission.id },
                data: { status: MissionStatus.FAILED },
            });

            throw e;
        }
    });

    await Promise.all(promises);

    const remainingTasksForMission = await db.task.count({
        where: {
            missionId: missionId,
            status: { not: TaskStatus.COMPLETED },
        },
    });

    if (remainingTasksForMission === 0) {
        await db.mission.update({
            where: { id: missionId },
            data: { status: MissionStatus.COMPLETED },
        });
    }

    return true;
};

const tryMission = async () => {
    // Find a pending mission
    const currentMission = await db.mission.findFirst({
        where: { status: MissionStatus.PENDING },
        orderBy: { createdAt: "asc" },
    });

    if (currentMission) {
        console.log(
            `Found mission: [${currentMission.id}] - Goal : ${currentMission.goal} - Starting execution ...`
        );

        //Set its status to RUNNING
        await db.mission.update({
            where: { id: currentMission.id },
            data: { status: MissionStatus.RUNNING },
        });

        const agentResponse = await agent.execMission(currentMission.goal);

        if (!agentResponse || agentResponse.includes('"error":'))
            throw new Error("Orchestraitor Agent mission execution failed.");

        // Clean response using regex
        const regex = /\[[\s\S]*\]/;
        const cleanedAgentResponse = regex.exec(agentResponse);

        if (!cleanedAgentResponse) {
            await db.mission.update({
                where: { id: currentMission.id },
                data: { status: MissionStatus.FAILED },
            });
            throw new Error("Orchestraitor Agent response was invalid");
        }
        // Parse the agent response to JSON
        try {
            const parsedAgentResponse: Array<ModelResponse> = JSON.parse(
                cleanedAgentResponse[0]
            );
            let newTasks: Array<CreateTask> = [];

            parsedAgentResponse.map((currTask) => {
                newTasks.push({
                    title: currTask.title,
                    description: currTask.description,
                    order: currTask.order,
                    missionId: currentMission.id,
                    type: currTask.type ?? TaskType.CODE,
                    status: TaskStatus.WAITING,
                    inputContext: currTask.inputContext ?? {},
                });
            });

            await db.task.createMany({ data: newTasks });

            // Get IDs of tasks that were just pushed
            const createdTasks = await db.task.findMany({
                where: { missionId: currentMission.id },
                select: { id: true, order: true },
            });

            const orderToId = new Map<number, string>(
                createdTasks.map((t) => [t.order, t.id])
            );

            // Create array of IDs
            const updatePromises = parsedAgentResponse
                .filter(
                    (currTask) =>
                        currTask.dependsOn &&
                        Array.isArray(currTask.dependsOn) &&
                        currTask.dependsOn.length > 0
                )
                .map((currTask) => {
                    const childTaskId = orderToId.get(currTask.order);
                    const connectIds = currTask.dependsOn
                        .map((parentOrder) => orderToId.get(parentOrder))
                        .filter((id) => !!id)
                        .map((id) => ({ id: id }));
                    if (!childTaskId || connectIds.length == 0) return null;
                    return db.task.update({
                        where: { id: childTaskId },
                        data: { dependencies: { connect: connectIds } },
                    });
                })
                .filter((promise) => promise != null);

            await Promise.all(updatePromises);
        } catch (e: unknown) {
            await db.mission.update({
                where: { id: currentMission.id },
                data: { status: MissionStatus.FAILED },
            });
            throw new Error(`Unknown Error occured :  ${e}`);
        }
    }
};

poll();
