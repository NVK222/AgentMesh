"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface MissionSummary {
    id: string;
    goal: string;
    status: string;
}

interface SidebarProps {
    initialMissions: MissionSummary[];
    activeMissionId?: string;
}

export function Sidebar({ initialMissions, activeMissionId }: SidebarProps) {
    const [missions, setMissions] = useState<MissionSummary[]>(initialMissions);
    const router = useRouter();

    useEffect(() => {
        const eventSource = new EventSource("/api/stream/missions");
        eventSource.onmessage = (event) => {
            try {
                const updatedMissions = JSON.parse(
                    event.data
                ) as MissionSummary[];
                setMissions(updatedMissions);
            } catch (e: unknown) {
                console.error(
                    `Failed parsing mission list from server :  ${e}`
                );
            }
        };

        return () => eventSource.close();
    }, []);

    return (
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
                    Active Missions ({missions.length})
                </p>
                {missions.map((mission) => {
                    const isActive = mission.id === activeMissionId;
                    return (
                        <button
                            key={mission.id}
                            onClick={() =>
                                router.push(`?missionId=${mission.id}`)
                            }
                            className={`w-full block p-3.5 rounded-xl border transition-all duration-200 text-left ${
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
                        </button>
                    );
                })}
            </div>
        </aside>
    );
}
