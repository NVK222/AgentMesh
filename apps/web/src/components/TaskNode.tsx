"use client";
import { ReactFlowElement } from "@/utils/layout";
import { Handle, Node, NodeProps, Position } from "@xyflow/react";

type CustomTaskNodeData = {
    title: string;
    status: string;
    order: number;
    type: string;
};

export type TaskNodeElement = Node<CustomTaskNodeData, "taskNode">;

const statusStyles: Record<string, string> = {
    WAITING: "bg-zinc-900 border-zinc-700 text-zinc-400",
    ACTIVE: "bg-zinc-900 border-purple-500 text-purple-200 shadow-lg shadow-purple-500/20 animate-pulse",
    COMPLETED: "bg-zinc-900 border-green-500 text-green-200",
    FAILED: "bg-zinc-900 border-red-500 text-red-200",
};

export function TaskNode({ data }: NodeProps<TaskNodeElement>) {
    const borderStyle = statusStyles[data.status] || statusStyles.WAITING;

    return (
        <div
            className={`p-4 rounded-xl border-2 w-56 text-smd backdrop-blur-md transition-all ${borderStyle}`}
        >
            <Handle
                type="target"
                position={Position.Left}
                className="!bg-zinc-600 !w-2 !h-2"
            />
            <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-mono font-bold px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-300">
                    #{data.order}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                    {data.status}
                </span>
                <span className="text-[10px] font-mono ml-auto opacity-50 bg-zinc-800 px-1 rounded">
                    {data.type}
                </span>
            </div>

            <div className="font-medium text-zinc-100 line-clamp-2">
                {data.title}
            </div>

            <Handle
                type="source"
                position={Position.Right}
                className="!bg-zinc-600 !w-2 !h-2"
            />
        </div>
    );
}
