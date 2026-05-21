/*
  Warnings:

  - You are about to drop the column `taskid` on the `AgentLog` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "LogType" AS ENUM ('INFO', 'CONTEXT', 'AGENT_RESPONSE', 'ERROR');

-- DropForeignKey
ALTER TABLE "AgentLog" DROP CONSTRAINT "AgentLog_taskid_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_missionId_fkey";

-- AlterTable
ALTER TABLE "AgentLog" DROP COLUMN "taskid",
ADD COLUMN     "logType" "LogType" NOT NULL DEFAULT 'INFO',
ADD COLUMN     "missionId" UUID,
ADD COLUMN     "taskId" UUID;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentLog" ADD CONSTRAINT "AgentLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentLog" ADD CONSTRAINT "AgentLog_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
