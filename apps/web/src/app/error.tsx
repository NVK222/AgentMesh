"use client";

import { useEffect } from "react";

interface ErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function GlobalErrorBoundary({ error, reset }: ErrorProps) {
    useEffect(() => {
        console.error("Dashboard Runtime Exception Hooked:", error);
    }, [error]);

    return (
        <div className="flex-1 min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center selection:bg-red-500/20">
            <div className="w-12 h-12 rounded-2xl bg-red-950/30 border border-red-500/30 flex items-center justify-center text-red-400 mb-6 font-mono text-xl shadow-lg shadow-red-500/5 animate-pulse">
                ⚠️
            </div>

            <h2 className="font-mono font-bold text-sm uppercase tracking-widest text-zinc-200 mb-2">
                App Crash
            </h2>

            <p className="text-xs text-zinc-500 max-w-md font-sans mb-6 leading-relaxed">
                An unexpected error occurred within the dashboard client
                rendering tree.
                {error.digest && (
                    <span className="block font-mono text-[10px] text-zinc-600 mt-2">
                        Digest ID: {error.digest}
                    </span>
                )}
            </p>

            <div className="w-full max-w-xl bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 mb-8 text-left overflow-x-auto max-h-40 font-mono text-[11px] text-red-300 leading-normal">
                <span className="text-zinc-500 mr-2 select-none">Error:</span>
                {error.message ||
                    "An unknown exception occurred during runtime render cycle."}
            </div>

            <div className="flex items-center gap-3">
                <button
                    onClick={() => reset()}
                    className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 hover:border-zinc-700 transition-all active:scale-95 shadow-sm"
                >
                    Reset
                </button>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-purple-600/10 border border-purple-500/20 rounded-xl text-xs font-medium text-purple-300 hover:text-purple-200 hover:bg-purple-600/20 hover:border-purple-500/40 transition-all active:scale-95 shadow-sm"
                >
                    Hard Reload Window
                </button>
            </div>
        </div>
    );
}
