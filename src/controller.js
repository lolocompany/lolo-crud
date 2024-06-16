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

  prepareEvent(ev, action) {
    if (!ev.crud) ev.crud = this.crud;
    if (!ev.crudAction) ev.crudAction = action;

    for (const prop of [ 'body', 'query', 'params', 'headers' ]) {
      if (!ev[prop]) ev[prop] = {};
    }
  }

  async run(action, ev, ctx = this.ctx) {
    this.prepareEvent(ev, action);

    const { auth, collection } = this;
    const { params } = ev;

    const actionCtx = {
      ...this,
      withHooks: async(stage, cb) => {
        await this.preHooks.run(stage, action, ev, ctx);
        const res = await cb();
        await this.postHooks.run(stage, action, ev, ctx);
        return res;
      }
    };

    await actionCtx.withHooks('auth', async() => {
      if (ev.session) return;
      ev.session = await auth.getSession(ev.headers);
    });

    ev.accountFilter = { accountId: ev.session.accountId };

    if (params.id) {
      await actionCtx.withHooks('load', async() => {
        if (ev.item) return;

        ev.item = await collection.findOne({ id: params.id, ...ev.accountFilter });
        if (!ev.item) ctx.fail('not found', 404);

        ev.prevItem = JSON.parse(JSON.stringify(ev.item));
      });
    }

    ev.crudResponse = await actions[action].call(actionCtx, ev, ctx);

    await actionCtx.withHooks('response', () => {});

    return ev.crudResponse;
  }

  addDefaultHooks() {
    const { preHooks, postHooks } = this;

    postHooks.add('auth', /.*/, hooks.authorizeMethod);
    postHooks.add('load', 'update', hooks.versionConflict);
    preHooks.add('save', 'create', hooks.validId);
    preHooks.add('save', /create|patch|update/, hooks.checkOutboundRefs);
    preHooks.add('save', 'delete', hooks.checkInboundRefs);

  }
}

module.exports = CrudController;
