const lodash = require('lodash');

const findByQueryString = (items, query) => {
  const { q, offset, limit, pick, sort, qor, qci, qre } = query;
  const fn = JSON.parse(qor) ? 'some' : 'every'; // or | and

  Object.keys(q).forEach(key => {
    q[key] = [].concat(q[key]);

    if (!/Ids?$/.test(key)) q[key] = q[key].map(
      pattern => new RegExp(pattern, 'i')
    );
  });

  const filterFn = item => {
    return Object.keys(q)[fn](
      key => q[key].some(pattern => {        
        if (key.endsWith('Ids')) {
          return (item[key] || []).includes(pattern);        // in
        }

        const value = typeof item[key] === 'undefined' ? 
          String() : 
          String(item[key]);

        return pattern.test ?
          pattern.test(value) :                              // re
          pattern.toLowerCase() === value.toLowerCase();     // eq
      })
    );
  };

  items = items
    .filter(filterFn)
    .sort(by(sort));

  const total = items.length;
  items = items.slice(offset, offset + limit);

  if (Array.isArray(pick)) {
    items = items.map(
      item => lodash.pick(item, pick)
    );
  }

  return {
    items,
    count: items.length,
    total
  };
};

const by = expr => {
  const [ key, direction = 'desc' ] = expr.split(' ');

  return (a, b) => {
    const aVal = a[key] || '';
    const bVal = b[key] || '';
    const an = aVal.toString().toLowerCase();
    const bn = bVal.toString().toLowerCase();

    return direction === 'asc' ?
      (an < bn) ? -1 : (an > bn) ? 1 : 0 :
      (an > bn) ? -1 : (an < bn) ? 1 : 0;
  };
};

// filterAndSortAll — used by `exportCursor` for state-backed collections.
//
// Mirrors the filter+sort behavior of `findByQueryString` but does NOT
// slice(offset, offset + limit) — exports always cover the full filtered
// set, paged externally via cursor checkpointing.
//
// `opts.keepKey` (default false) skips the `pick` projection; the export
// flow passes `keepKey: true` so every item still carries its `id` for
// resume matching. `src/formatters.js#stripResumeKey` is what later drops
// the key from output if the user's pick[] didn't include it.
const filterAndSortAll = (items, query, opts = {}) => {
  const { q, pick, sort, qor } = query;
  const fn = JSON.parse(qor) ? 'some' : 'every';

  const qCopy = {};
  Object.keys(q).forEach(key => {
    qCopy[key] = [].concat(q[key]);
    if (!/Ids?$/.test(key)) {
      qCopy[key] = qCopy[key].map(pattern => new RegExp(pattern, 'i'));
    }
  });

  const filterFn = item => {
    return Object.keys(qCopy)[fn](
      key => qCopy[key].some(pattern => {
        if (key.endsWith('Ids')) {
          return (item[key] || []).includes(pattern);
        }
        const value = typeof item[key] === 'undefined' ?
          String() :
          String(item[key]);
        return pattern.test ?
          pattern.test(value) :
          pattern.toLowerCase() === value.toLowerCase();
      })
    );
  };

  let out = items.filter(filterFn).sort(by(sort));

  if (!opts.keepKey && Array.isArray(pick)) {
    out = out.map(item => lodash.pick(item, pick));
  }

  return out;
};

module.exports = {
  findByQueryString,
  filterAndSortAll
};
