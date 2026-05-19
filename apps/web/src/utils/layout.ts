import { TaskNodeElement } from "@/components/TaskNode";
import * as d3 from "d3-hierarchy";

type ReactFlowEdge = {
    id: string;
    source: string;
    target: string;
    animated: boolean;
    style: { stroke: string; strokeWidth: number };
};

export interface WorkspaceTask {
    id: string;
    title: string;
    status: string;
    order: number;
    type: string;
    dependsOn: number[];
}

interface GraphNodeData {
    id: string;
    task?: WorkspaceTask;
    children?: GraphNodeData[];
}

export interface ReactFlowElement {
    id: string;
    type?: string;
    position: { x: number; y: number };
    data: { title: string; status: string; order: number; type: string };
}

export const getLayoutedElements = (
    tasks: WorkspaceTask[]
): { nodes: TaskNodeElement[]; edges: ReactFlowEdge[] } => {
    const orderToTask = new Map<number, WorkspaceTask>(
        tasks.map((t) => [t.order, t])
    );

    const rootData: GraphNodeData = { id: "root", children: [] };
    const rootTasks = tasks.filter(
        (t) => !t.dependsOn || t.dependsOn.length === 0
    );

    const buildTree = (task: WorkspaceTask): GraphNodeData => {
        const children = tasks.filter((t) => t.dependsOn?.includes(task.order));
        return { id: task.id, task, children: children.map(buildTree) };
    };

    rootData.children = rootTasks.map(buildTree);

    const treeLayout = d3.tree<GraphNodeData>().nodeSize([140, 260]);
    const hierarchyRoot = d3.hierarchy<GraphNodeData>(rootData);
    treeLayout(hierarchyRoot);

    const reactFlowNodes: TaskNodeElement[] = [];
    const reactFlowEdges: ReactFlowEdge[] = [];

    hierarchyRoot.descendants().forEach((node) => {
        if (node.data.id === "root" || !node.data.task) return;

        const currentTask = node.data.task;

        reactFlowNodes.push({
            id: currentTask.id,
            type: "taskNode",
            position: { x: node.y || 0, y: node.x || 0 },
            data: {
                title: currentTask.title,
                status: currentTask.status,
                order: currentTask.order,
                type: currentTask.type,
            },
        });

        currentTask.dependsOn?.forEach((parentOrder) => {
            const parentTask = orderToTask.get(parentOrder);
            if (parentTask) {
                reactFlowEdges.push({
                    id: `e-${parentTask.id}-${currentTask.id}`,
                    source: parentTask.id,
                    target: currentTask.id,
                    animated: currentTask.status === "ACTIVE",
                    style: {
                        stroke:
                            currentTask.status === "ACTIVE"
                                ? "#a855f7"
                                : "#4b5563",
                        strokeWidth: 2,
                    },
                });
            }
        });
    });

    return { nodes: reactFlowNodes, edges: reactFlowEdges };
};
