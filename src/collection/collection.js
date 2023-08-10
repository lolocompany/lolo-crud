const pluralize = require('pluralize');
const Ajv = require('ajv');

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

  async findOne(filter) {
  }

  async find(filter) {
  }

  async findByQueryString(query, baseFilter) {
    const isValid = validateQueryString(query);

    if (!isValid) {
      const err = new Error('validation failed');
      err.body = validateQueryString.errors;
      err.status = 422;
      throw err;
    }
  }
}

function kebabize(str) {
  return str.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
}

module.exports = Collection;

const ajv = new Ajv({
  allErrors: true,
  removeAdditional: 'all',
  useDefaults: true,
  coerceTypes: true
});

const validateQueryString = ajv.compile({
  type: 'object',
  properties: {
    q: {
      type: 'object',
      default: {}
    },
    qor: {
      type: 'integer',
      default: 0,
      enum: [
        0,
        1
      ]
    },
    qre: {
      type: 'integer',
      default: 0,
      enum: [
        0,
        1
      ]
    },
    qci: {
      type: 'integer',
      default: 0,
      enum: [
        0,
        1
      ]
    },
    sort: {
      type: 'string',
      default: 'createdAt desc'
    },
    pick: {
      type: 'array',
      items: {
        type: 'string'
      }
    },
    limit: {
      type: 'integer',
      default: '10',
      minimum: 0,
      maximum: 500
    },
    offset: {
      type: 'integer',
      default: 0,
      minimum: 0
    }
  }
});
