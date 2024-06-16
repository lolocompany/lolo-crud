const pluralize = require('pluralize');

/*
 * Base class for collection providers
 */

class Collection {
  constructor(resourceName, ctx) {
    this.name = pluralize(kebabize(resourceName));
  }

  async insertOne(item) {
  }

  async updateOne(item) {
  }

  async deleteOne(item) {
  }

  async deleteMany(filter) {
  }

  async orphan(fkName, fk) {
  }

  async findOne(filter) {
  }

  async find(filter) {
  }

  async findByQueryString(query, baseFilter) {
  }
}

function kebabize(str) {
  return str.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
}

module.exports = Collection;
