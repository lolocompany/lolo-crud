const lodash = require('lodash');

const findByQueryString = (items, query) => {
  const { q, offset, limit, pick, sort, qor, qci, qre } = query;
  const fn = JSON.parse(qor) ? 'some' : 'every';

  Object.keys(q).forEach(key => {
    q[key] = [].concat(q[key]); // ensure array

    if (JSON.parse(qre)) {
      // Build RegExp's once
      q[key] = q[key].map(pattern => {
        return new RegExp(pattern, qci ? 'i' : undefined);
      });
    }
  });

  const filterFn = item => {
    return Object.keys(q)[fn](key => q[key][fn](pattern => {

      const value = item.hasOwnProperty(key) ? '' + item[key] : '';

      if (pattern.test) return pattern.test(value);
      if (JSON.parse(qci)) return pattern.toLowerCase() === value.toLowerCase();
      return pattern === value;
    }));
  };

  items = items
    .filter(filterFn)
    .sort(by(sort));

  const total = items.length;
  items = items.slice(offset, offset + limit);

  if (Array.isArray(pick)) {
    items = items.map(item => {
      return lodash.pick(item, pick);
    });
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
