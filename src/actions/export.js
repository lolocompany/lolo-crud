const crypto = require('crypto');
const Ajv = require('ajv');

const MAX_ACTIVE_PER_USER = 3;

const ajv = new Ajv({ allErrors: true, removeAdditional: 'all', useDefaults: true, coerceTypes: true });
const validate = ajv.compile({
  type: 'object',
  properties: {
    q:    { type: 'object', default: {} },
    qor:  { type: 'integer', default: 0, enum: [0, 1] },
    qre:  { type: 'integer', default: 0, enum: [0, 1] },
    qci:  { type: 'integer', default: 0, enum: [0, 1] },
    pick: { type: 'array', items: { type: 'string' } },
    format: { type: 'string', default: 'csv', enum: ['csv', 'json'] },
    jobId: { type: 'string' }
  }
});

module.exports = async function exportAction(ev, ctx) {
  if (!validate(ev.query)) {
    const err = new Error('validation failed');
    err.body = validate.errors; err.status = 422; throw err;
  }
  const queue = ctx.getExportQueue();
  if (!queue) return { status: 501, body: { error: 'export not configured' } };

  if (ev.query.jobId) return getStatus(queue, ev.query.jobId, ev.session.email);

  const outstanding = await queue.getJobs(['wait', 'active']);
  const mine = outstanding.filter(j => j && j.data && j.data.email === ev.session.email).length;
  if (mine >= MAX_ACTIVE_PER_USER) {
    return { status: 429, body: { error: 'too many active exports' } };
  }

  ev.query.sort = 'id asc';
  const { jobId: _, ...query } = ev.query;
  const newJobId = crypto.randomUUID();
  await queue.add('export', {
    resourceName: this.crud.resourceName,
    resourceNamePlural: this.crud.resourceNamePlural,
    query,
    accountFilter: ev.accountFilter,
    format: ev.query.format,
    email: ev.session.email
  }, { jobId: newJobId });
  return { status: 202, body: { jobId: newJobId } };
};

async function getStatus(queue, jobId, email) {
  const job = await queue.getJob(jobId);
  if (!job || !job.data || job.data.email !== email) {
    return { status: 404, body: { error: 'not found' } };
  }
  const state = await job.getState();
  const startedAt = job.processedOn || job.timestamp;
  const elapsedSeconds = Math.round(((job.finishedOn || Date.now()) - startedAt) / 1000);
  const status = state === 'completed' ? 'completed'
               : state === 'failed'    ? 'failed'
                                       : 'running';
  return { status: 200, body: { status, elapsedSeconds } };
}
