/*
 * Stream formatters and helpers for the export action / CRUD Export Worker.
 *
 * Scope: only the helpers the worker's CSV pipeline can't get from
 * `@fast-csv/format`, plus the hand-rolled streaming JSON formatter
 * (no off-the-shelf streamer for `{"<plural>":[...]}` worth a dep).
 *
 * RFC 4180 quoting / cell-escaping / header emission is delegated to
 * fast-csv inside the worker; this module is intentionally lean to keep
 * lolo-crud free of a CSV runtime dependency.
 */

// Spreadsheet formula-injection sentinel (CWE-1236). When a cell starts
// with one of these characters, Excel / Google Sheets / Numbers all
// treat the cell as a live formula on open. Prefixing with a single
// quote forces a text-literal interpretation.
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

/**
 * formatJsonDoc(doc, isFirst, isLast, resourceNamePlural) -> string
 *
 * Produces the bytes for a single document inside the streaming
 * `{"<resourceNamePlural>":[ ... ]}` envelope. Wrapped by a small
 * Transform inside the worker's makeFormatTransform factory.
 *
 * On the first doc, prepends the open envelope. After the first, just
 * a comma separator. On the last, appends the close envelope. The
 * factory in the worker handles the empty-cursor case (close-only flush).
 */
function formatJsonDoc(doc, isFirst, isLast, resourceNamePlural) {
  let out = '';
  if (isFirst) out += `{"${resourceNamePlural}":[`;
  else out += ',';
  out += JSON.stringify(doc);
  if (isLast) out += ']}';
  return out;
}

/**
 * stripResumeKey(doc, pick) -> doc
 *
 * The cursor always retains the key field (`_id` / `id`) for resume
 * tracking, even when the user's `pick[]` excludes it (see §1b). This
 * helper drops the key from the document before output if `pick` was
 * provided and didn't include `id` / `_id`.
 *
 * Returns a shallow copy when stripping; otherwise returns the original
 * reference (callers in the format transform never mutate further).
 */
function stripResumeKey(doc, pick) {
  if (!Array.isArray(pick) || pick.length === 0) return doc;
  const wantsId = pick.includes('id') || pick.includes('_id');
  if (wantsId) return doc;

  const { id, _id, ...rest } = doc; // eslint-disable-line no-unused-vars
  return rest;
}

/**
 * schemaColumns(schema, pick) -> string[]
 *
 * Column-name array for the CSV header, derived from
 * `schema.properties` keys and filtered by the user's `pick[]` when
 * present. Deriving from schema (rather than from the first observed
 * document) gives two guarantees:
 *
 *   1. A header row is always emitted, even when the result set is
 *      empty (combined with fast-csv's `writeHeaders: true`).
 *   2. Columns stay consistent across resumed attempts regardless of
 *      which document is first in a given chunk.
 */
function schemaColumns(schema, pick) {
  const allKeys = schema && schema.properties
    ? Object.keys(schema.properties)
    : [];

  if (Array.isArray(pick) && pick.length > 0) {
    return allKeys.filter(k => pick.includes(k));
  }
  return allKeys;
}

/**
 * escapeCell(value) -> string
 *
 * fast-csv handles RFC 4180 structural quoting (commas, embedded quotes,
 * CR/LF). This helper covers two concerns it doesn't:
 *
 *   1. Nested values. The default `String(value)` yields `[object Object]`
 *      for any non-primitive; we JSON.stringify instead so nested objects
 *      / arrays survive the trip into a CSV cell as readable JSON.
 *   2. Spreadsheet formula injection (CWE-1236). Values whose first char
 *      is `= + - @ \t \r` are prefixed with `'` so the spreadsheet treats
 *      the cell as text on open. The prefix lands inside fast-csv's later
 *      structural quotes (the spreadsheet convention that triggers the
 *      text-literal behavior).
 *
 * `null` / `undefined` collapse to an empty string.
 */
function escapeCell(value) {
  if (value === null || value === undefined) return '';

  let str;
  if (typeof value === 'object') {
    str = JSON.stringify(value);
  } else {
    str = String(value);
  }

  if (FORMULA_PREFIX.test(str)) str = "'" + str;
  return str;
}

/**
 * shapeForCsv(row, pick) -> object
 *
 * Thin composer the worker passes as fast-csv's `transform` option:
 * strips the resume key (when not in pick[]) and runs every value
 * through `escapeCell`. fast-csv then sees an object whose values are
 * all strings (or empty strings) and applies its own structural quoting.
 */
function shapeForCsv(row, pick) {
  const cleaned = stripResumeKey(row, pick);
  const out = {};
  for (const key of Object.keys(cleaned)) {
    out[key] = escapeCell(cleaned[key]);
  }
  return out;
}

module.exports = {
  formatJsonDoc,
  stripResumeKey,
  schemaColumns,
  escapeCell,
  shapeForCsv
};
