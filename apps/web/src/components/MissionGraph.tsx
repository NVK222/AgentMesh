"use client";

import { getLayoutedElements, WorkspaceTask } from "@/utils/layout";
import "@xyflow/react/dist/style.css";
import { TaskNode } from "./TaskNode";
import { useMemo } from "react";
import { Background, Controls, MiniMap, ReactFlow } from "@xyflow/react";

interface MissionGraphProps {
    tasks: WorkspaceTask[];
}

const nodeTypes = { taskNode: TaskNode };

export function MissionGraph({ tasks }: MissionGraphProps) {
    const { nodes, edges } = useMemo(() => getLayoutedElements(tasks), [tasks]);

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
                        else if (node.data?.status === "ACTIVE")
                            return "#a855f7";
                        else if (node.data?.status === "FAILED")
                            return "#ef4444";
                        else return "#27272a";
                    }}
                    maskColor="rgba(9,9,11,0.7)"
                />
            </ReactFlow>
            {tasks.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-zinc-500 font-mono text-sm">
                        No tasks for this mission.
                    </p>
                </div>
            )}
        </div>
    );
}
