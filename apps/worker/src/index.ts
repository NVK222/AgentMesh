import {
    AgentMissionExecResultArray,
    db,
    MissionStatus,
    TaskStatus,
    TaskType,
} from "@agentmesh/shared";
import { Agent } from "./services/agent.service";
import "dotenv/config";
import type { InputJsonValue } from "packages/shared/src/generated/client/internal/prismaNamespace";
import { flattenError, ZodError } from "zod";

const agent = new Agent(
    process.env.GEMINI_API_KEY ?? "",
    "gemini-3.1-flash-lite"
);
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

const poll = async () => {
    try {
        if (!(await tryTasks())) {
            await tryMission();
        }
    } catch (e: unknown) {
        if (e instanceof ZodError) {
            console.error(flattenError(e).fieldErrors);
        } else if (e instanceof Error) {
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

    const missionId = readyTasks.at(0)?.missionId;
    console.log(
        `[ORCHESTRATOR] found ${readyTasks.length} tasks for mission ${missionId}. Running in parallel`
    );

    const promises = readyTasks.map(async (task) => {
        //Update their status to active
        await db.task.update({
            where: { id: task.id },
            data: { status: TaskStatus.ACTIVE },
        });

        try {
            //Create a history string for the agent
            let history = `# Dependency data:\n`;

            if (task.dependencies.length === 0) {
                history += `None (This is a root task.)`;
            } else {
                task.dependencies
                    .slice(-NUM_TASKS_IN_HISTORY)
                    .forEach((parent) => {
                        const result =
                            typeof parent.outputResult === "string"
                                ? parent.outputResult
                                : JSON.stringify(parent.outputResult, null, 2);
                        history += `### Task ${parent.order} : ${parent.title}\n`;
                        history += `### Result:\n${result}`;
                    });
            }

            console.log(
                `[WORKER] History for task order ${task.order} :  ${history}`
            );

            const agentResponse = await agent.execTask(
                task.description,
                history,
                task.mission.goal
            );
            if (!agentResponse || agentResponse.includes('"error":'))
                throw new Error("Worker Agent task failed.");

            console.log(
                `[AGENT] response for task order ${task.order} ${agentResponse}`
            );

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

        console.log(`[RAW AGENT] ${agentResponse}`);

        if (!agentResponse || agentResponse.includes('"error":'))
            throw new Error("Orchestrator Agent mission execution failed.");

        // Parse the agent response to JSON
        try {
            const jsonAgentResponse = JSON.parse(agentResponse);
            const parsedAgentResponse =
                AgentMissionExecResultArray.parse(jsonAgentResponse);
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

                console.log(`${currTask.title} -- ${currTask.order}`);
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
            if (e instanceof ZodError) throw e;
            throw new Error(`Unknown Error occured :  ${e}`);
        }
    }
};

poll();
