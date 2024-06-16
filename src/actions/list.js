const Ajv = require('ajv');

async function list(ev, ctx) {
  const { query, accountFilter } = ev;
  const { resourceNamePlural } = this.crud;

  prepareQueryString(query);

  await this.withHooks('load', async() => {
    if (ev.items) return;

    const { items, total } = await this.collection.findByQueryString(
      query,
      accountFilter
    );

    ev.items = items;
    ev.total = total;
  });

  return {
    status: 200,
    body: {
      [resourceNamePlural]: ev.items,
      count: ev.items.length,
      total: ev.total
    }
  };
}

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

const prepareQueryString = query => {
  const isValid = validateQueryString(query);

  if (!isValid) {
    const err = new Error('validation failed');
    err.body = validateQueryString.errors;
    err.status = 422;
    throw err;
  }
};

module.exports = list;
