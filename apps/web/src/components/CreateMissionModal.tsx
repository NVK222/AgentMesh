"use client";

import { createMission } from "@/app/actions/mission";
import { useState } from "react";

export function CreateMissionModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, setIsPending] = useState(false);

    const handleSubmit = async (_: unknown) => {
        setIsPending(true);
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs rounded-xl border border-purple-500/30 transition-all duration-200 shadow-lg shadow-purple-900/20 active:scale-[0.98] cursor-pointer"
            >
                + Create New Mission
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div
                        className="absolute inset-0"
                        onClick={() => !isPending && setIsOpen(false)}
                    />

                    <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl overflow-hidden text-left">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-200 font-mono mb-1">
                            Create Mission
                        </h3>
                        <p className="text-xs text-zinc-500 mb-4 font-sans">
                            Define a high-level objective. The multi-agent
                            orchestrator will decompose this statement into
                            separate task chains automatically.
                        </p>

                        <form
                            action={createMission}
                            onSubmit={handleSubmit}
                            className="space-y-4"
                        >
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono mb-1.5">
                                    Mission
                                </label>
                                <textarea
                                    name="goal"
                                    required
                                    rows={4}
                                    disabled={isPending}
                                    placeholder="e.g., Build a production-grade typescript scraping worker engine that watches a targeted api endpoint for anomalies ..."
                                    className="w-full p-3 bg-zinc-950 text-zinc-100 text-xs border border-zinc-800 rounded-xl focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none transition-colors font-mono placeholder:text-zinc-700 leading-relaxed disabled:opacity-50 resize-none"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 text-xs font-mono">
                                <button
                                    type="button"
                                    disabled={isPending}
                                    onClick={() => setIsOpen(false)}
                                    className="px-4 py-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="px-4 py-2 bg-zinc-100 text-zinc-950 hover:bg-zinc-200 font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                                >
                                    {isPending ? (
                                        <>
                                            <span className="w-3 h-3 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        "Create New Mission"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
