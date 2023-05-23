const pluralize = require('pluralize');

class Collection {
  constructor(resourceName, ctx) {
    this.name = pluralize(kebabize(resourceName));
  }

  async insertOne(item) {
    throw new NotImplemented();
  }

  async updateOne(item) {
    throw new NotImplemented();
  }

  async deleteOne(item) {
    throw new NotImplemented();
  }

  async findOne(filter) {
    throw new NotImplemented();
  }

  async find(filter) {
    throw new NotImplemented();
  }

  async findByQueryString(query, baseFilter) {
    throw new NotImplemented();
  }
}

class NotImplemented extends Error {
  constructor() {
    super('not implemented');
  }
}

function kebabize(str) {
  return str.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
}

module.exports = Collection;
