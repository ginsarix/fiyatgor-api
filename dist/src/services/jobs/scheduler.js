import cron, {} from "node-cron";
export const jobs = new Map();
export function createJob(id, expression, fn) {
    const task = cron.schedule(expression, fn);
    jobs.set(id, task);
    console.log(jobs.keys());
}
export function deleteJob(id) {
    jobs.get(id)?.destroy();
    jobs.delete(id);
    console.log(jobs.keys());
}
