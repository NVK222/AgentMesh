export const MissionStatus = Object.freeze({
  PENDING: "PENDING",
  RUNNING: "RUNNING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  PAUSED: "PAUSED",
} as const);

export const TaskStatus = Object.freeze({
  WAITING: "WAITING",
  COMPLETED: "COMPLETED",
  READY: "READY",
  ACTIVE: "ACTIVE",
  REJECTED: "REJECTED",
} as const);

export const TaskType = Object.freeze({
  RESEARCH: "RESEARCH",
  CODE: "CODE",
  REVIEW: "REVIEW",
  DEPLOY: "DEPLOY",
} as const);

export type MissionStatus = (typeof MissionStatus)[keyof typeof MissionStatus];
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];
export type TaskType = (typeof TaskType)[keyof typeof TaskType];
