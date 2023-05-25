const { buildValidate } = require('./schema');
const actions = require('./actions');
const hooks = require('./hooks');

class CrudController {
  constructor(crud) {
    this.crud = crud;
    this.validate = buildValidate(crud.schema);

    this.preHooks  = new hooks.Registry();
    this.postHooks = new hooks.Registry();

    this.collection = null;
    this.auth = null;

    this.addDefaultHooks();
  }

  init(ctx) {
    const { authHelper } = ctx.params;

    this.ctx = ctx;
    this.auth = ctx[authHelper](ctx);
    this.collection = this.crud.collection;
  }

  prepareEvent(ev) {
    if (!ev.crud) ev.crud = this.crud;

    for (const prop of [ 'body', 'query', 'params', 'headers' ]) {
      if (!ev[prop]) ev[prop] = {};
    }
  }

  async run(action, ev, ctx = this.ctx) {
    this.prepareEvent(ev);

    const actionCtx = {
      ...this,
      withHooks: async(stage, cb) => {
        await this.preHooks.run(stage, action, ev, ctx);
        const res = await cb();
        await this.postHooks.run(stage, action, ev, ctx);
        return res;
      }
    };

    await this.preAction(actionCtx, ev, ctx);
    const res = await actions[action].call(actionCtx, ev, ctx);

    await actionCtx.withHooks('response', () => {});
    return res;
  }

  async preAction(actionCtx, ev, ctx) {
    const { auth, collection } = this;
    const { params } = ev;

    await actionCtx.withHooks('auth', async() => {
      if (!ev.session) {
        ev.session = await auth.getSession(ev.headers);
      }
    });

    ev.accountFilter = { accountId: ev.session.accountId };

    await actionCtx.withHooks('load', async() => {
      if (params.id) {
        ev.item = await collection.findOne({
          id: params.id,
          ...ev.accountFilter
        });
        if (!ev.item) ctx.fail('not found', 404);
      }
    });
  }

  addDefaultHooks() {
    const { preHooks, postHooks } = this;

    postHooks.add('load', 'update', hooks.versionConflict);
    preHooks.add('save', 'create', hooks.uniqueId);
    preHooks.add('save', /create|patch|update/, hooks.checkOutboundRefs);
    preHooks.add('save', 'delete', hooks.checkInboundRefs);
  }
}

module.exports = CrudController;
