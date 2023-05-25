const lodash = require('lodash');
const Collection = require('./collection');

class StateCollection extends Collection {
  constructor(resourceName, ctx) {
    super(resourceName, ctx);
    this.state = ctx.state;
  }

  async insertOne(item) {
    return this.updateOne(item);
  }

  async updateOne(item) {
    const key = this.buildKey(item);
    return this.state.set(key, item);
  }

  async deleteOne(item) {
    const key = this.buildKey(item);
    return this.state.set(key, null);
  }

  async findOne(filter) {
    if (filter.id && filter.accountId) {
      // avoid scan if we're able to build a key
      const item = this.state.get(this.buildKey(filter));
      if (this.exactMatch(item, filter)) return item;
    }

    const items = await this.find(filter);
    return items.shift();
  }

  async find(filter) {
    const re = new RegExp(`^${this.name}:`);

    return this.state.keys(re).reduce(
      (memo, key) => {
        const item = this.state.get(key);
        if (item && this.exactMatch(item, filter)) memo.push(item);
        return memo;
      },
      []
    );
  }

  async findByQueryString(query, baseFilter) {
    const items = await this.find(baseFilter);
    return findByQueryString(items, query);
  }

  buildKey(item) {
    return [
      this.name,
      item.accountId,
      item.id
    ].join(':');
  }

  exactMatch(item = {}, filter = {}) {
    return Object.entries(filter).every(
      ([ fk, fv ]) => item[fk] === fv
    );
  }
}

module.exports = StateCollection;

const findByQueryString = (items, query) => {
  const { q = {}, offset = 0, limit = 10, pick = [], sort = 'createdAt asc' } = query;
  const { qor = false, qci = false, qre = false } = query;

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
