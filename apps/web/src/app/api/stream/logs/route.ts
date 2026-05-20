import { db } from "@agentmesh/shared";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const targetMissionId = searchParams.get("missionId");

    if (!targetMissionId) {
        return new Response("Mission missionId param", { status: 400 });
    }

    const responseStream = new TransformStream();
    const writer = responseStream.writable.getWriter();
    const encoder = new TextEncoder();

    let lastLogsSignature = "";

    const pollInterval = setInterval(async () => {
        if (req.signal.aborted) {
            clearInterval(pollInterval);
            try {
                writer.close();
            } catch (e) {}
            return;
        }

        try {
            const allLogs = await db.agentLog.findMany({
                where: {
                    OR: [
                        { missionId: targetMissionId },
                        { task: { missionId: targetMissionId } },
                    ],
                },
                select: {
                    id: true,
                    agentRole: true,
                    logType: true,
                    content: true,
                    createdAt: true,
                    taskId: true,
                },
                orderBy: {
                    createdAt: "asc",
                },
            });

            const currSignature = JSON.stringify(allLogs);

            if (currSignature !== lastLogsSignature && allLogs.length > 0) {
                lastLogsSignature = currSignature;
                await writer.write(
                    encoder.encode(`data:  ${currSignature}\n\n`)
                );
            }
        } catch (e) {
            console.error("Logging error:  ", e);
        }
    }, 1000);

    req.signal.addEventListener("abort", () => {
        clearInterval(pollInterval);
        try {
            writer.close();
        } catch (e) {}
    });

    return new Response(responseStream.readable, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
        },
    });
}
