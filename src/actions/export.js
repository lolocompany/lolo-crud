const crypto = require('crypto');
const Ajv = require('ajv');

/*
 * Async export action. A single GET endpoint handles both triggering an
 * export and polling status by branching on `query.jobId`:
 *
 *   GET /<resource>/export?<filter params>&format=csv  →  startExport
 *   GET /<resource>/export?jobId=<id>                  →  getExportStatus
 *
 * The action talks to BullMQ only via the shared Queue instance returned
 * by ctx.getExportQueue() (registered by the CRUD Export Worker library
 * function's Queue node). lolo-crud itself never imports `bullmq`.
 */

// Plan §1h — per-user backpressure (default; overridable via
// ctx.getExportLimits() if the export worker registers it).
const DEFAULT_MAX_ACTIVE_PER_USER = 3;

async function exportAction(ev, ctx) {
  const { query } = ev;

  prepareExportQueryString(query);

  if (query.jobId) {
    return getExportStatus.call(this, ev, ctx, query.jobId);
  }

  return startExport.call(this, ev, ctx);
}

// startExport — mints a UUID jobId, refuses if the caller already has
// EXPORT_MAX_ACTIVE_PER_USER outstanding jobs in the queue, and adds a
// job to the BullMQ Queue (registered as ctx.getExportQueue()). The
// pre-signed download URL is NOT returned here — only the jobId, which
// the caller polls and the worker emails.
async function startExport(ev, ctx) {
  const { crud } = this;
  const { query } = ev;

  const queue = getQueueOrNull(ctx);
  if (!queue) {
    return {
      status: 501,
      body: { error: 'export not configured' }
    };
  }

  const maxActive = getMaxActivePerUser(ctx);

  // Plan §1h: cheapest-possible per-user concurrent-job cap. Anyone with
  // a session can otherwise hammer this endpoint and enqueue arbitrarily
  // many unbounded scans; the worker's concurrency only caps simultaneous
  // execution, not queue depth, so this is the only thing standing
  // between a malicious or buggy caller and an unbounded number of S3
  // multipart uploads + SES sends.
  //
  // TOCTOU race: two parallel POST /export from the same user can both
  // read `mine=N` and both enqueue. Acceptable for v1 — see §6a's
  // rate-limiter-flexible follow-up.
  const outstanding = await queue.getJobs(['wait', 'delayed', 'active']);
  const mine = outstanding.filter(
    j => j && j.data && j.data.email === ev.session.email
  ).length;

  if (mine >= maxActive) {
    return {
      status: 429,
      body: {
        error: 'too many active exports',
        message: `You have ${mine} export(s) running. Wait for one to finish before starting another.`
      }
    };
  }

  const { jobId, ...filterQuery } = query;

  const jobData = {
    resourceName: crud.resourceName,
    resourceNamePlural: crud.resourceNamePlural,
    query: filterQuery,
    accountFilter: ev.accountFilter,
    format: query.format,
    pick: query.pick,
    email: ev.session.email,
    appId: process.env.LO_APP_ID
  };

  // crypto.randomUUID() instead of BullMQ's default sequential INCR id —
  // jobIds are returned to the caller and must not be enumerable.
  const newJobId = crypto.randomUUID();

  await queue.add('export', jobData, { jobId: newJobId });

  return {
    status: 202,
    body: { jobId: newJobId }
  };
}

// getExportStatus — looks up a job by id on the shared Queue and returns
// a sanitized status object. Compares job.data.email against the caller
// session before returning anything; on mismatch returns 404 (NOT 403)
// so the response never confirms a job exists for a different user.
//
// Active-state response carries a `progress` block with { count, total,
// percent, rate, etaSeconds } per §1i. Completed-state responses do NOT
// include the pre-signed URL — that lives in the email only.
async function getExportStatus(ev, ctx, jobId) {
  const queue = getQueueOrNull(ctx);
  if (!queue) {
    return {
      status: 501,
      body: { error: 'export not configured' }
    };
  }

  const job = await queue.getJob(jobId);
  if (!job) {
    return notFound();
  }

  // Ownership check — UUID ids make enumeration impractical, but a
  // leaked id (logs, error reports, browser history) is otherwise game
  // over without this check. 404 not 403 so the response never confirms
  // existence for a different user.
  if (!job.data || job.data.email !== ev.session.email) {
    return notFound();
  }

  const state = await job.getState();

  switch (state) {
    case 'completed': {
      const ret = job.returnvalue || {};
      return {
        status: 200,
        body: {
          status: 'completed',
          format: ret.format || job.data.format,
          count: ret.count != null ? ret.count : (job.progress && job.progress.count) || 0
        }
      };
    }

    case 'failed': {
      // Plan §6b — sanitize. Never echo job.failedReason directly;
      // BullMQ surfaces the raw last-attempt error message, which can
      // include connection strings, internal paths, and the query.
      // For v1, the whitelisted code is always 'internal_error' until
      // a typed error-class mapping is added; the field is named so
      // the portal's error-rendering can stay forward-compatible.
      return {
        status: 200,
        body: {
          status: 'failed',
          error: 'internal_error'
        }
      };
    }

    case 'active': {
      const progress = job.progress || {};
      return {
        status: 200,
        body: {
          status: 'active',
          progress: buildProgressBody(progress)
        }
      };
    }

    case 'waiting':
    case 'waiting-children':
    case 'delayed':
    case 'paused':
    default:
      // Plan §1i — `waiting` / retry-pending / paused: portal must keep
      // polling, label as "Resuming export…", and not treat as error.
      return {
        status: 200,
        body: { status: 'waiting' }
      };
  }
}

// Plan §1i — builds the progress object surfaced to the polling portal.
// Computes `rate` from the per-attempt window (attemptStartedAt /
// attemptStartCount) so retry backoff time doesn't deflate throughput.
// `percent` clamps to 100 because the source collection can grow
// between count and stream.
function buildProgressBody(progress) {
  const count = progress.count != null ? progress.count : 0;
  const total = progress.total != null ? progress.total : null;
  const attemptStartedAt = progress.attemptStartedAt || null;
  const attemptStartCount = progress.attemptStartCount != null
    ? progress.attemptStartCount
    : 0;

  let percent = null;
  if (total != null && total > 0) {
    percent = Math.min(100, Math.round((count / total) * 100));
  }

  let rate = null;
  if (attemptStartedAt) {
    const elapsedSec = (Date.now() - attemptStartedAt) / 1000;
    const docsThisAttempt = count - attemptStartCount;
    if (elapsedSec > 0 && docsThisAttempt > 0) {
      rate = Math.round(docsThisAttempt / elapsedSec);
    }
  }

  let etaSeconds = null;
  if (total != null && rate != null && rate > 0) {
    etaSeconds = Math.max(0, Math.round((total - count) / rate));
  }

  return { count, total, percent, rate, etaSeconds };
}

function notFound() {
  return {
    status: 404,
    body: { error: 'not found' }
  };
}

function getQueueOrNull(ctx) {
  // The Queue node in the CRUD Export Worker library function registers
  // this helper. Apps without that worker installed return 501 (export
  // not configured) on every call.
  if (typeof ctx.getExportQueue !== 'function') return null;
  try {
    return ctx.getExportQueue();
  } catch (_err) {
    return null;
  }
}

function getMaxActivePerUser(ctx) {
  if (typeof ctx.getExportLimits === 'function') {
    try {
      const limits = ctx.getExportLimits() || {};
      if (typeof limits.maxActivePerUser === 'number') {
        return limits.maxActivePerUser;
      }
    } catch (_err) { /* fall through to default */ }
  }
  return DEFAULT_MAX_ACTIVE_PER_USER;
}

const ajv = new Ajv({
  allErrors: true,
  removeAdditional: 'all',
  useDefaults: true,
  coerceTypes: true
});

// Plan §1a — query schema mirrors `list` for filter params (q, qor,
// qre, qci, pick) but drops limit / offset / sort. Exports always sort
// by `_id asc` for resumability, so an explicit `sort` would be ignored
// — we drop it from the schema to surface that explicitly.
const validateQueryString = ajv.compile({
  type: 'object',
  properties: {
    q:    { type: 'object', default: {} },
    qor:  { type: 'integer', default: 0, enum: [0, 1] },
    qre:  { type: 'integer', default: 0, enum: [0, 1] },
    qci:  { type: 'integer', default: 0, enum: [0, 1] },
    pick: { type: 'array', items: { type: 'string' } },
    format: { type: 'string', default: 'csv', enum: ['csv', 'json'] },
    jobId:  { type: 'string' }
  }
});

function prepareExportQueryString(query) {
  const isValid = validateQueryString(query);

  if (!isValid) {
    const err = new Error('validation failed');
    err.body = validateQueryString.errors;
    err.status = 422;
    throw err;
  }

  // Exports always sort by `_id asc` for resume granularity. Set the
  // sort here so providers (state filterAndSortAll, mongo exportCursor)
  // see a deterministic value. State provider's sort respects this; the
  // Mongo provider hard-codes `{ _id: 1 }` regardless.
  query.sort = 'id asc';
}

module.exports = exportAction;
