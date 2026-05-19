import { WorkspaceTask } from "@/utils/layout";
import { db } from "@agentmesh/shared";
import { MissionGraph } from "@/components/MissionGraph";
import React from "react";

interface PageProps {
    searchParams: Promise<{ missionId?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const activeMissionId = params.missionId;

    const allMissions = await db.mission.findMany({
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            goal: true,
            status: true,
            createdAt: true,
        },
    });

    const targetMissionId = activeMissionId || allMissions[0]?.id;

    const dbTasks = targetMissionId
        ? await db.task.findMany({
              where: { missionId: targetMissionId },
              orderBy: { order: "asc" },
              include: {
                  dependencies: {
                      select: { order: true },
                  },
              },
          })
        : [];

    const formattedTasks: WorkspaceTask[] = dbTasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        order: t.order,
        type: t.type || "CODE",
        dependsOn: Array.isArray(t.dependencies)
            ? t.dependencies.map((dep: { order: number }) => dep.order)
            : [],
    }));

    const activeMission = allMissions.find((m) => m.id === targetMissionId);
    return (
        <div className="flex w-full h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
            <aside className="w-80 border-r border-zinc-800 bg-zinc-900/40 flex flex-col h-full flex-shrink-0">
                <div className="p-5 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500 shadow-md shadow-purple-500/50 animate-pulse" />
                        <h1 className="font-mono font-bold tracking-wider uppercase text-sm text-zinc-200">
                            AgentMesh Control Center
                        </h1>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-2 mb-1">
                        Active Pipelines ({allMissions.length})
                    </p>
                    {allMissions.map((mission) => {
                        const isActive = mission.id === targetMissionId;
                        return (
                            <a
                                key={mission.id}
                                href={`?missionId=${mission.id}`}
                                className={`block p-3.5 rounded-xl border transition-all duration-200 text-left ${
                                    isActive
                                        ? "bg-purple-950/20 border-purple-500/50 text-purple-200 shadow-sm"
                                        : "bg-zinc-900/30 border-zinc-800/60 hover:bg-zinc-900/80 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200"
                                }`}
                            >
                                <div className="font-medium text-xs truncate mb-1">
                                    {mission.goal}
                                </div>
                                <div className="flex items-center gap-1.5 font-mono text-[9px] opacity-75">
                                    <span
                                        className={`w-1.5 h-1.5 rounded-full ${
                                            mission.status === "COMPLETED"
                                                ? "bg-green-500"
                                                : mission.status === "RUNNING"
                                                  ? "bg-purple-500 animate-pulse"
                                                  : "bg-zinc-500"
                                        }`}
                                    />
                                    {mission.status}
                                </div>
                            </a>
                        );
                    })}
                </div>
            </aside>

            <main className="flex-1 flex flex-col h-full p-6 overflow-hidden">
                {activeMission ? (
                    <React.Fragment>
                        <header className="mb-6 flex-shrink-0">
                            <div className="text-[10px] font-mono tracking-widest text-purple-400 uppercase font-bold mb-1">
                                Currently Monitoring Pipeline
                            </div>
                            <h2 className="text-xl font-bold tracking-tight text-zinc-100 max-w-3xl">
                                {activeMission.goal}
                            </h2>
                            <p className="text-xs font-mono text-zinc-500 mt-1">
                                ID: {activeMission.id}
                            </p>
                        </header>

                        <div className="flex-1 min-h-0">
                            <MissionGraph tasks={formattedTasks} />
                        </div>
                    </React.Fragment>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/10">
                        <p className="text-sm font-mono text-zinc-500">
                            No system orchestration targets available in
                            PostgreSQL.
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
}
