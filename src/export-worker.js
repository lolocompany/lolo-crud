const { Worker, Queue } = require('bullmq');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { Readable, Transform } = require('node:stream');
const { createGzip } = require('node:zlib');
const { format: csvFormat } = require('@fast-csv/format');

const QUEUE = `crud-export-${process.env.LO_APP_ID}`;
const conn = {
  host: process.env.REDIS_HOST,
  port: +process.env.REDIS_PORT || 6379,
  ...(process.env.REDIS_PASSWORD ? { password: process.env.REDIS_PASSWORD } : {})
};
const Bucket = process.env.EXPORT_S3_BUCKET;
const credentials = {
  accessKeyId: process.env.EXPORT_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.EXPORT_AWS_SECRET_ACCESS_KEY
};

let started = false;
let queue = null;

const jsonStream = () => {
  let first = true;
  return new Transform({
    objectMode: true,
    transform(d, _e, cb) { this.push((first ? '[' : ',') + JSON.stringify(d)); first = false; cb(); },
    flush(cb) { this.push(first ? '[]' : ']'); cb(); }
  });
};

const start = (registry, log) => {
  if (started) return;
  started = true;
  const s3 = new S3Client({
    credentials,
    region: process.env.EXPORT_S3_REGION,
    endpoint: process.env.EXPORT_AWS_ENDPOINT,
    forcePathStyle: !!process.env.EXPORT_AWS_ENDPOINT
  });
  const ses = new SESClient({
    credentials,
    region: process.env.EXPORT_SES_REGION || process.env.EXPORT_S3_REGION
  });
  queue = new Queue(QUEUE, { connection: conn });

  new Worker(QUEUE, async job => {
    const { resourceName, query, accountFilter, format, pick, email } = job.data;
    const { collection, resourceNamePlural } = registry.getCrud(resourceName);
    const cursor = await collection.exportCursor(query, accountFilter, null, { pick });
    const formatter = format === 'csv' ? csvFormat({ headers: true }) : jsonStream();
    const Body = Readable.from(cursor, { objectMode: true }).pipe(formatter).pipe(createGzip());
    const Key = `exports/${resourceNamePlural}/${job.id}.${format}.gz`;
    await new Upload({ client: s3, params: { Bucket, Key, Body } }).done();
    const url = await getSignedUrl(s3, new GetObjectCommand({
      Bucket, Key,
      ResponseContentEncoding: 'gzip',
      ResponseContentType: format === 'csv' ? 'text/csv' : 'application/json',
      ResponseContentDisposition: `attachment; filename="${resourceNamePlural}.${format}"`
    }), { expiresIn: 86400 });
    await ses.send(new SendEmailCommand({
      Destination: { ToAddresses: [email] },
      Source: process.env.EXPORT_SES_FROM_ADDRESS || 'lo-lo-no-reply@lolo.company',
      Message: {
        Subject: { Data: `Your ${resourceNamePlural} export is ready` },
        Body: { Html: { Data: `<p>Your export is ready.</p><p><a href="${url}">Download (link expires in 24 h)</a></p>` } }
      }
    }));
  }, { connection: conn });

  log.info({ queue: QUEUE }, 'export-worker started');
};

module.exports = { start, getQueue: () => queue };
