const lodash = require('lodash');
const { crudFields } = require('../schema');

async function patch(ev, ctx) {
  const { body, session, item } = ev;

  lodash.merge(
    item,
    lodash.omit(body, crudFields),
    {
      version: (item.version || 0) + 1,
      updatedAt: new Date().toISOString(),
      updatedBy: session.email
    }
  );

  await this.withHooks('validate', async() => {
    await this.validate(ev.item);
  });

  await this.withHooks('save', async() => {
    await this.collection.updateOne(item);
  });

  return {
    status: 200,
    body: item
  };
}

module.exports = patch;
