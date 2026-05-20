"use client";

import { useEffect, useRef, useState } from "react";

const LogType = {
    INFO: "INFO",
    CONTEXT: "CONTEXT",
    AGENT_RESPONSE: "AGENT_RESPONSE",
    ERROR: "ERROR",
} as const;

type LogType = (typeof LogType)[keyof typeof LogType];

interface AgentLogRecord {
    id: string;
    agentRole: string;
    logType: LogType;
    content: string;
    createdAt: string;
    taskId: string | null;
}

interface TerminalPageProps {
    missionId: string;
}

export function TerminalPane({ missionId }: TerminalPageProps) {
    const [logs, setLogs] = useState<AgentLogRecord[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!missionId) return;

        const eventSource = new EventSource(
            `/api/stream/logs?missionId=${missionId}`
        );

        eventSource.onmessage = (event) => {
            try {
                const incomingLogs = JSON.parse(event.data) as AgentLogRecord[];
                setLogs(incomingLogs);
            } catch (e) {
                console.error("Terminal logs error", e);
            }
        };

        eventSource.onerror = () => {
            eventSource.close();
        };

        return () => {
            eventSource.close();
            setLogs([]);
        };
    }, [missionId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div className="h-72 bg-zinc-950 border border-zinc-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl font-mono text-xs">
            <div className="bg-zinc-900 px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between text-zinc-400 text-[11px] font-bold uppercase tracking-wider select-none">
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-zinc-700/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-zinc-700/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-zinc-700/80" />
                    <span className="ml-2 text-zinc-300 tracking-normal text-xs normal-case">
                        agentmesh@orchestrator:~
                    </span>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">
                    Logs Length: {logs.length}
                </div>
            </div>

            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-black/40 scrollbar-thin selection:bg-purple-500/30 text-zinc-400"
            >
                {logs.length === 0 ? (
                    <div className="text-zinc-600 italic animate-pulse">
                        No Logs yet.
                    </div>
                ) : (
                    logs.map((log) => {
                        const timestamp = new Date(
                            log.createdAt
                        ).toLocaleTimeString();
                        const isMissionLog = !log.taskId;
                        const taskTag = !isMissionLog
                            ? `[#${log.taskId?.slice(-4)}]`
                            : "[MISSION]";

                        let typeColor =
                            "text-blue-400 bg-blue-950/30 border-blue-500/30";
                        let contentStyle = "text-zinc-400";

                        if (isMissionLog) {
                            typeColor =
                                "text-emerald-400 bg-emerald-950/40 border-emerald-500/40 font-bold tracking-wide";
                            contentStyle =
                                "text-emerald-200/90 font-semibold border-l-2 border-emerald-500 pl-2 py-0.5 my-1 bg-emerald-950/10 rounded-r-lg";
                        } else if (log.logType === LogType.CONTEXT) {
                            typeColor =
                                "text-amber-400 bg-amber-950/20 border-amber-500/20";
                            contentStyle = "text-zinc-500 italic";
                        } else if (log.logType === LogType.AGENT_RESPONSE) {
                            typeColor =
                                "text-purple-400 bg-purple-950/30 border-purple-500/30";
                            contentStyle =
                                "text-zinc-100 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800/80 mt-1 block font-mono text-[11px] leading-relaxed whitespace-pre-wrap";
                        } else if (log.logType === LogType.ERROR) {
                            typeColor =
                                "text-red-400 bg-red-950/40 border-red-500/40 font-bold";
                            contentStyle = "text-red-300/90 font-medium";
                        }

                        return (
                            <div
                                key={log.id}
                                className="text-left select-text group transition-colors duration-150 py-0.5"
                            >
                                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                    <span className="text-zinc-600 text-[10px]">
                                        {timestamp}
                                    </span>

                                    <span
                                        className={`font-bold font-mono text-[10px] ${isMissionLog ? "text-emerald-500/80" : "text-zinc-400"}`}
                                    >
                                        {taskTag}
                                    </span>

                                    <span
                                        className={`px-1.5 py-0.5 text-[9px] uppercase font-bold tracking-wider rounded border ${typeColor}`}
                                    >
                                        {isMissionLog
                                            ? "ORCHESTRATOR"
                                            : log.agentRole}{" "}
                                        › {log.logType}
                                    </span>
                                </div>
                                <div className={contentStyle}>
                                    {log.content}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
