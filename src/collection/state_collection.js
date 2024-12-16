const Collection = require('./collection');
const { findByQueryString } = require('./state_utils');

class StateCollection extends Collection {
  constructor(resourceName, ctx) {
    super(resourceName, ctx);
    this.state = ctx.state;
  }

  async insertOne(item) {
    super.insertOne(item);
    return this.updateOne(item);
  }

  async updateOne(item) {
    super.updateOne(item);
    const key = this.buildKey(item);
    return this.state.set(key, item);
  }

  async deleteOne(item) {
    super.deleteOne(item);
    const key = this.buildKey(item);
    return this.state.set(key, null);
  }

  async deleteMany(filter) {
    for (const item of await this.find(filter)) {
      await this.deleteOne(item);
    }
  }

  async findOne(filter) {
    super.findOne(filter);
    if (filter.id && filter.accountId) {
      // avoid scan if we're able to build a key
      const item = this.state.get(this.buildKey(filter));
      if (this.matchFilter(item, filter)) return item;
    }

    const items = await this.find(filter);
    return items.shift();
  }

  async find(filter) {
    super.find(filter);
    const re = new RegExp(`^${this.name}:`);

    return this.state.keys(re).reduce(
      (memo, key) => {
        const item = this.state.get(key);
        if (item && this.matchFilter(item, filter)) memo.push(item);
        return memo;
      },
      []
    );
  }

  async findByQueryString(query, baseFilter) {
    super.findByQueryString(query, baseFilter);
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

  matchFilter(item = {}, filter = {}) {
    return Object.entries(filter).every(([ key, value ]) => {
      if (Array.isArray(value)) {
        return value.includes(item[key]); // or

      } else {
        return key.endsWith('Ids') ?
          item[key].includes(value) :     // in
          item[key] === value;            // eq
      }
    });
  }
}

module.exports = StateCollection;
