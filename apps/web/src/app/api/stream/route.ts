import { db } from "@agentmesh/shared";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const targetMissionId = searchParams.get("missionId");
    const isCanvasEmpty = searchParams.get("empty") === "true";

    if (!targetMissionId) {
        return new Response("Missing missionId parameter", { status: 400 });
    }

    const responseStream = new TransformStream();
    const writer = responseStream.writable.getWriter();
    const encoder = new TextEncoder();

    // Hash to avoid duplicates
    let lastStateSignature = "";
    let sentAllTasks = false;

    const pollInterval = setInterval(async () => {
        if (req.signal.aborted) {
            clearInterval(pollInterval);
            try {
                writer.close();
            } catch (_) {}
            return;
        }

        try {
            const needFullDetails = isCanvasEmpty && !sentAllTasks;
            let responseString = "";

            if (needFullDetails) {
                const fullTasks = await db.task.findMany({
                    where: { missionId: targetMissionId },
                    orderBy: { order: "asc" },
                    include: { dependencies: { select: { order: true } } },
                });

                if (fullTasks.length > 0) {
                    const fullPayload = fullTasks.map((t) => ({
                        id: t.id,
                        title: t.title,
                        status: t.status,
                        order: t.order,
                        type: t.type || "CODE",
                        dependsOn: t.dependencies.map((d) => d.order),
                    }));

                    responseString = JSON.stringify(fullPayload);
                    sentAllTasks = true;
                }
            } else {
                const statusTask = await db.task.findMany({
                    where: { missionId: targetMissionId },
                    orderBy: { order: "asc" },
                    select: { id: true, status: true },
                });

                if (statusTask.length > 0) {
                    responseString = JSON.stringify(statusTask);
                }
            }

            // If a task changed state, broadcast the updated matrix immediately
            if (responseString && responseString !== lastStateSignature) {
                lastStateSignature = responseString;
                await writer.write(
                    encoder.encode(`data: ${responseString}\n\n`)
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
