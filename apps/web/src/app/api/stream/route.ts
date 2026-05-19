import { db } from "@agentmesh/shared";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const targetMissionId = searchParams.get("missionId");

    if (!targetMissionId) {
        return new Response("Missing missionId parameter", { status: 400 });
    }

    const responseStream = new TransformStream();
    const writer = responseStream.writable.getWriter();
    const encoder = new TextEncoder();

    // Hash to avoid duplicates
    let lastStateSignature = "";

    // Set up an automated execution interval block
    const pollInterval = setInterval(async () => {
        if (req.signal.aborted) {
            clearInterval(pollInterval);
            try {
                writer.close();
            } catch (_) {}
            return;
        }

        try {
            const currentTasks = await db.task.findMany({
                where: { missionId: targetMissionId },
                select: { id: true, status: true },
                orderBy: { order: "asc" },
            });

            const currentStateSignature = JSON.stringify(currentTasks);

            // If a task changed state, broadcast the updated matrix immediately
            if (currentStateSignature !== lastStateSignature) {
                lastStateSignature = currentStateSignature;
                await writer.write(
                    encoder.encode(`data: ${JSON.stringify(currentTasks)}\n\n`)
                );
            }
        } catch (err) {
            console.error("Poller engine database extraction exception:", err);
        }
    }, 1000);

    req.signal.addEventListener("abort", () => {
        clearInterval(pollInterval);
        try {
            writer.close();
        } catch (_) {}
    });

    return new Response(responseStream.readable, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
        },
    });
}
