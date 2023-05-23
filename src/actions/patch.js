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

  await this.preHook('validate');
  await this.validate(ev.item);

  await this.preHook('save');
  await this.collection.updateOne(item);

  await this.preHook('response');

  return {
    body: item
  };
}

module.exports = patch;
