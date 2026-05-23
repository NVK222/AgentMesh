"use server";
import { db, missionQueue } from "@agentmesh/shared";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createMission(formData: FormData) {
    const goal = formData.get("goal") as string;
    if (!goal || goal.trim().length < 5) {
        throw new Error("Mission goal must be atleast 5 characters long");
    }

    const newMission = await db.mission.create({
        data: {
            goal: goal.trim(),
        },
    });

    await missionQueue.add(
        "execute-mission",
        { missionId: newMission.id },
        {
            attempts: 3,
            backoff: 5000,
            removeOnComplete: {
                age: 3600,
                count: 50,
            },
            removeOnFail: { age: 86400 },
        }
    );

    revalidatePath("/");
    redirect(`/?missionId=${newMission.id}`);
}
