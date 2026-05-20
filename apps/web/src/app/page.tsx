import { WorkspaceTask } from "@/utils/layout";
import { db } from "@agentmesh/shared";
import { MissionGraph } from "@/components/MissionGraph";
import React from "react";
import { Sidebar } from "@/components/Sidebar";
import { TerminalPane } from "@/components/TerminalPane";

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
            <Sidebar
                initialMissions={allMissions}
                activeMissionId={targetMissionId}
            />

            <main className="flex-1 flex flex-col h-full p-6 overflow-hidden">
                {activeMission ? (
                    <React.Fragment>
                        <header className="mb-6 flex-shrink-0">
                            <div className="text-[10px] font-mono tracking-widest text-purple-400 uppercase font-bold mb-1">
                                Currently Monitoring Mission
                            </div>
                            <h2 className="text-xl font-bold tracking-tight text-zinc-100 max-w-3xl">
                                {activeMission.goal}
                            </h2>
                            <p className="text-xs font-mono text-zinc-500 mt-1">
                                ID: {activeMission.id}
                            </p>
                        </header>

                        <div className="flex-1 min-h-0">
                            <MissionGraph
                                key={targetMissionId}
                                tasks={formattedTasks}
                                missionId={targetMissionId}
                            />
                        </div>

                        <TerminalPane missionId={targetMissionId} />
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
