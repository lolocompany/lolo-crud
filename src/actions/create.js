const { generate: uuid } = require('short-uuid');

async function create(ev, ctx) {
  const { body, session } = ev;

  ev.item = {
    ...body,
    id: body.id || uuid(),
    accountId: session.accountId,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: session.email,
    updatedBy: session.email
  };

  await this.withHooks('validate', async() => {
    await this.validate(ev.item);
  });

  await this.withHooks('save', async() => {
    await this.collection.insertOne(ev.item);
  });

  return {
    body: ev.item,
    status: 202
  };
}

module.exports = create;
