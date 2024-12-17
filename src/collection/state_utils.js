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

module.exports = {
  findByQueryString
};
