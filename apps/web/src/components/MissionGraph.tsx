"use client";
import React, { useMemo, useState, useEffect } from "react";
import { ReactFlow, Background, Controls, MiniMap } from "@xyflow/react";
import { TaskNode, type TaskNodeElement } from "./TaskNode";
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

        const eventSource = new EventSource(
            `/api/stream?missionId=${missionId}`
        );

        eventSource.onmessage = (event) => {
            try {
                const updatedTaskStatuses = JSON.parse(event.data) as {
                    id: string;
                    status: string;
                }[];
                setCurrentTasks((prevTasks) =>
                    prevTasks.map((task) => {
                        const match = updatedTaskStatuses.find(
                            (update) => update.id === task.id
                        );
                        return match ? { ...task, status: match.status } : task;
                    })
                );
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
    }, [missionId]);

    // 3. Map our dynamic state tasks into D3 coordinates and edges
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
                <Controls className="!bg-zinc-900 !border-zinc-700 !text-zinc-100 fill-zinc-100" />
                <MiniMap
                    className="!bg-zinc-900 !border-zinc-800"
                    nodeColor={(node) => {
                        if (node.data?.status === "COMPLETED") return "#22c55e";
                        if (node.data?.status === "ACTIVE") return "#a855f7";
                        if (node.data?.status === "FAILED") return "#ef4444";
                        return "#27272a";
                    }}
                    maskColor="rgba(9, 9, 11, 0.7)"
                />
            </ReactFlow>
        </div>
    );
}
