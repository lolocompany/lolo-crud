const lodash = require('lodash');
const { crudFields } = require('../schema');

async function update(ev, ctx) {
  const { body, session } = ev;

  ev.item = {
    ...lodash.omit(body, crudFields),
    ...lodash.pick(ev.item, crudFields),
    version: (ev.item.version || 0) + 1,
    updatedAt: new Date().toISOString(),
    updatedBy: session.email
  };

  await this.withHooks('validate', async() => {
    await this.validate(ev.item);
  });

  await this.withHooks('save', async() => {
    await this.collection.updateOne(ev.item);
  });

  return {
    status: 200,
    body: ev.item
  };
}

module.exports = update;
