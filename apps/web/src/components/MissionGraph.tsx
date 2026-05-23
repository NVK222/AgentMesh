"use client";
import { useMemo, useState, useEffect } from "react";
import { ReactFlow, Background, Controls, MiniMap } from "@xyflow/react";
import { TaskNode } from "./TaskNode";
import { getLayoutedElements, WorkspaceTask } from "@/utils/layout";
import "@xyflow/react/dist/style.css";

interface MissionGraphProps {
    tasks: WorkspaceTask[];
    missionId: string;
}

const nodeTypes = { taskNode: TaskNode };

export function MissionGraph({
    tasks: initialTasks,
    missionId,
}: MissionGraphProps) {
    const [currentTasks, setCurrentTasks] =
        useState<WorkspaceTask[]>(initialTasks);

    useEffect(() => {
        if (!missionId) return;

        const isEmpty = currentTasks.length === 0;
        const eventSource = new EventSource(
            `/api/stream?missionId=${missionId}&empty=${isEmpty}`
        );

        eventSource.onmessage = (event) => {
            try {
                const incomingData = JSON.parse(event.data);
                if (!Array.isArray(incomingData) || incomingData.length === 0)
                    return;

                const isFullPayload = "title" in incomingData[0];
                if (isFullPayload) {
                    setCurrentTasks(incomingData as WorkspaceTask[]);
                } else {
                    setCurrentTasks((prevTasks) =>
                        prevTasks.map((task) => {
                            const match = incomingData.find(
                                (update) => update.id === task.id
                            );
                            return match
                                ? { ...task, status: match.status }
                                : task;
                        })
                    );
                }
            } catch (err) {
                console.error(
                    "Failed to parse incoming streaming event matrix:",
                    err
                );
            }
        };

        eventSource.onerror = (err) => {
            console.error("SSE stream experienced a connection error:", err);
            eventSource.close();
        };

        return () => {
            eventSource.close();
        };
    }, [missionId, currentTasks.length]);

    const { nodes, edges } = useMemo(
        () => getLayoutedElements(currentTasks),
        [currentTasks]
    );

    return (
        <div className="w-full h-full bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden relative">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                fitView
                minZoom={0.2}
                maxZoom={1.5}
            >
                <Background color="#27272a" gap={20} size={1} />
            </ReactFlow>
        </div>
    );
}
