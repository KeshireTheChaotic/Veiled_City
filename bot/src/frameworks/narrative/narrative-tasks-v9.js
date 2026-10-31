/** Native obligation accounting; a creative model's answered flag has no authority. */
const dispositions = new Set(['answered', 'held', 'unavailable', 'needs_clarification']);
const id = value => typeof value === 'string' && value.length > 0 && value.length <= 160;
export function createNarrativeTasks(entries) {
  if (!Array.isArray(entries) || entries.length > 24) throw new TypeError('bounded tasks required');
  const map = new Map();
  for (const task of entries) {
    if (!id(task?.id) || !id(task?.source_event) || !id(task?.operation) || map.has(task.id))
      throw new TypeError('unique native task/source required');
    map.set(task.id, Object.freeze({id: task.id, source_event: task.source_event,
      operation: task.operation, target_ref: task.target_ref || null, status: 'pending', proof_ref: null}));
  }
  return map;
}

/** resolveTask MUST verify native part/task/target/audience/source proof; no model-supplied status is sufficient. */
export function resolveNarrativeTask(tasks, taskId, proposed, resolveTask) {
  const prior = tasks.get(taskId);
  if (!prior || prior.status !== 'pending' || !dispositions.has(proposed?.status)
    || typeof resolveTask !== 'function') throw new TypeError('pending task and native proof required');
  const proof = resolveTask(prior, proposed);
  if (proof?.accepted !== true || !id(proof.proof_ref) || proof.source_event !== prior.source_event
    || proof.task_id !== prior.id || proof.status !== proposed.status) throw new TypeError('task proof rejected');
  tasks.set(taskId, Object.freeze({...prior, status: proof.status, proof_ref: proof.proof_ref}));
  return tasks.get(taskId);
}

export function summarizeNarrativeTasks(tasks) {
  const values = [...tasks.values()];
  return Object.freeze({total: values.length, answered: values.filter(t => t.status === 'answered').length,
    outstanding: values.filter(t => t.status === 'pending' || t.status === 'held').map(t => t.id),
    complete: values.every(t => ['answered', 'unavailable', 'needs_clarification'].includes(t.status))});
}
