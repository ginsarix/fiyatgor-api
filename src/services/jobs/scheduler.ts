import cron, { type ScheduledTask } from "node-cron";

export const jobs = new Map<number, ScheduledTask>();

export function createJob(id: number, expression: string, fn: () => unknown) {
  const task = cron.schedule(expression, fn);
  jobs.set(id, task);
}

export function deleteJob(id: number) {
  jobs.get(id)?.destroy();
  jobs.delete(id);
}
