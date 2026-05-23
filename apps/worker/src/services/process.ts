import {
    AgentMissionExecResultArray,
    db,
    LogType,
    MissionStatus,
    TaskStatus,
    TaskType,
} from "@agentmesh/shared";
import { Agent } from "../services/agent.service";
import "dotenv/config";
import type { InputJsonValue } from "packages/shared/src/generated/client/internal/prismaNamespace";
import { flattenError, ZodError } from "zod";
import { logger } from "../utils/logger";

const agent = new Agent(
    process.env.GEMINI_API_KEY ?? "",
    "gemini-3.1-flash-lite"
);
const NUM_TASKS_IN_HISTORY = 5;
const MAX_RETRIES = 3;

interface CreateTask {
    missionId: string;
    type: TaskType;
    status: TaskStatus;
    title: string;
    description: string;
    order: number;
    inputContext: InputJsonValue;
}

const tryTasks = async (missionId: string) => {
    // Get all tasks whose dependencies have been fulfilled
    const readyTasks = await db.task.findMany({
        where: {
            status: TaskStatus.WAITING,
            mission: { id: missionId, status: MissionStatus.RUNNING },
            dependencies: { none: { status: { not: TaskStatus.COMPLETED } } },
        },
        orderBy: { order: "asc" },
        include: { mission: true, dependencies: true },
    });

    if (readyTasks.length === 0) return null;

    logger.orchestrator(
        `Found ${readyTasks.length} tasks for mission ${missionId}. Running in parallel`
    );

    const promises = readyTasks.map(async (task) => {
        //Update their status to active
        await db.task.update({
            where: { id: task.id },
            data: { status: TaskStatus.ACTIVE },
        });

        await db.agentLog.create({
            data: {
                taskId: task.id,
                agentRole: `WORKER [${task.type}]`,
                logType: LogType.INFO,
                content: "Starting execution of task.",
            },
        });

        try {
            logger.debug(`Creating history string for task ${task.id}`);
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

            await db.agentLog.create({
                data: {
                    taskId: task.id,
                    agentRole: `WORKER [${task.type}]`,
                    logType: LogType.CONTEXT,
                    content: `Context from tasks ${task.dependencies.length} has been added.`,
                },
            });

            const agentResponse = await agent.execTask(
                task.description,
                history,
                task.mission.goal
            );
            if (!agentResponse || agentResponse.includes('"error":'))
                throw new Error("Worker Agent task failed.");

            logger.worker(`Response for task ${task.id} ${agentResponse}`);

            await db.agentLog.create({
                data: {
                    taskId: task.id,
                    agentRole: `WORKER [${task.type}]`,
                    logType: LogType.AGENT_RESPONSE,
                    content: agentResponse,
                },
            });

            await db.task.update({
                where: { id: task.id },
                data: {
                    status: TaskStatus.COMPLETED,
                    outputResult: agentResponse,
                },
            });
            logger.success(`Task ${task.id} completed successfully`);
        } catch (e) {
            // If any task fails, retry if attempts less than MAX_TRIEs

            const updatedTask = await db.task.update({
                where: { id: task.id },
                data: { attempts: { increment: 1 } },
            });
            if (updatedTask.attempts < MAX_RETRIES) {
                logger.worker(
                    `Task ${task.id} failed. Attempt ${task.attempts}/${MAX_RETRIES}. Retrying...`
                );
                await db.task.update({
                    where: { id: task.id },
                    data: { status: TaskStatus.WAITING },
                });
            } else {
                await db.task.update({
                    where: { id: task.id },
                    data: { status: TaskStatus.FAILED },
                });
                await db.mission.update({
                    where: { id: task.mission.id },
                    data: { status: MissionStatus.FAILED },
                });
                await db.agentLog.create({
                    data: {
                        taskId: task.id,
                        agentRole: "[WORKER]",
                        logType: LogType.ERROR,
                        content:
                            e instanceof Error
                                ? e.message
                                : "Unknown Error Occured.",
                    },
                });
            }

            if (e instanceof Error) logger.error(e.message);
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
        logger.success(`Mission ${missionId} completed successfully.`);
        await db.agentLog.create({
            data: {
                missionId: missionId,
                agentRole: "ORCHESTRATOR",
                logType: LogType.INFO,
                content: "Mission completed successfully.",
            },
        });
    } else if (remainingTasksForMission > 0) {
        await tryTasks(missionId);
    }
};

export const tryMission = async (missionId: string) => {
    const currentMission = await db.mission.findUnique({
        where: { id: missionId },
    });
    if (currentMission && currentMission.status == MissionStatus.PENDING) {
        logger.orchestrator(
            `Found mission: [${currentMission.id}] - Goal : ${currentMission.goal} - Starting execution ...`
        );

        //Set its status to RUNNING
        await db.mission.update({
            where: { id: currentMission.id },
            data: { status: MissionStatus.RUNNING },
        });
        await db.agentLog.create({
            data: {
                missionId: currentMission.id,
                agentRole: "ORCHESTRATOR",
                logType: LogType.INFO,
                content: `Mission found successfully with goal :  ${currentMission.goal}`,
            },
        });

        const agentResponse = await agent.execMission(currentMission.goal);

        logger.orchestrator(`Response:\n${agentResponse}`);

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
            });

            await db.task.createMany({ data: newTasks });
            await db.agentLog.create({
                data: {
                    missionId: currentMission.id,
                    agentRole: "ORCHESTRATOR",
                    logType: LogType.INFO,
                    content: `Number of tasks created:  ${parsedAgentResponse.length.toString()}`,
                },
            });

            logger.success(
                `${parsedAgentResponse.length.toString()} tasks were created.`
            );

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

            // Call tryTasks
            await tryTasks(missionId);
        } catch (e: unknown) {
            await db.mission.update({
                where: { id: currentMission.id },
                data: { status: MissionStatus.FAILED },
            });
            await db.agentLog.create({
                data: {
                    missionId: currentMission.id,
                    agentRole: "ORCHESTRATOR",
                    logType: LogType.ERROR,
                    content: `Mission failed:  ${e}`,
                },
            });
            if (e instanceof ZodError) {
                flattenError(e).fieldErrors;
            }
            console.error(`Unknown Error occured :  ${e}`);
        }
    }
};
