import { db } from "@agentmesh/shared";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const responseStream = new TransformStream();
    const writer = responseStream.writable.getWriter();
    const encoder = new TextEncoder();

    let lastMissionSignature = "";

    const pollInterval = setInterval(async () => {
        if (req.signal.aborted) {
            clearInterval(pollInterval);
            try {
                writer.close();
            } catch (e) {}
            return;
        }

        try {
            const allMissions = await db.mission.findMany({
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    goal: true,
                    status: true,
                    createdAt: true,
                },
            });

            const currentSignature = JSON.stringify(allMissions);

            // Broadcast to sidebar if new mission was created
            if (currentSignature != lastMissionSignature) {
                lastMissionSignature = currentSignature;
                await writer.write(
                    encoder.encode(`data: ${currentSignature}\n\n`)
                );
            }
        } catch (e: unknown) {
            console.error(`[Mission Stream] Error : ${e}`);
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
