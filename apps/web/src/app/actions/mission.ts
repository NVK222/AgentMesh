"use server";
import { db } from "@agentmesh/shared";
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

    revalidatePath("/");
    redirect(`/?missionId=${newMission.id}`);
}
