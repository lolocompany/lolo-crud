const { buildValidate } = require('./schema');
const actions = require('./actions');
const hooks = require('./hooks');

class CrudController {
  constructor(crud) {
    this.crud = crud;

    this.validate = buildValidate(crud.schema);
    this.preHooks = new hooks.Registry();

    this.collection = null;
    this.auth = null;

    hooks.addDefault(this);
  }

  init(ctx) {
    const { authHelper } = ctx.params;

    this.auth = ctx[authHelper](ctx);
    this.collection = this.crud.collection;
  }

  prepareEvent(ev) {
    if (!ev.crud) ev.crud = this.crud;

    for (const prop of [ 'body', 'query', 'params', 'headers' ]) {
      if (!ev[prop]) ev[prop] = {};
    }
  }

  async run(action, ev, ctx) {
    this.prepareEvent(ev);

    const actionCtx = {
      ...this,
      preHook: stage => this.preHooks.run(stage, action, ev, ctx)
    };

    await this.preAction(actionCtx, ev, ctx);
    return actions[action].call(actionCtx, ev, ctx);
  }

  async preAction(actionCtx, ev, ctx) {
    const { auth, collection } = this;
    const { params } = ev;

    if (!ev.session) {
      await actionCtx.preHook('auth');
      ev.session = await auth.getSession(ev.headers);
    }

    ev.accountFilter = { accountId: ev.session.accountId };

    if (params.id) {
      await actionCtx.preHook('load');

      ev.item = await collection.findOne({
        id: params.id,
        ...ev.accountFilter
      });

      if (!ev.item) ctx.fail('not found', 404);
    }
  }
}

module.exports = CrudController;
