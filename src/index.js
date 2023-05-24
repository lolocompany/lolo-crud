const Crud = require('./crud');
const CrudRegistry = require('./registry');

const { Collection, StateCollection } = require('./collection');
const { Auth, LoloAuth } = require('./auth');

const getInstance = () => {
  const registry = new CrudRegistry();

  const addResource = bCtx => {
    const { params, addHelper, log } = bCtx;

    const crud = new Crud(params, log, registry);
    registry.addCrud(crud);

    addHelper('getCrud', ctx => (resourceName = ctx.params.resourceName) => {
      return registry.getCrud(resourceName);
    });

    addHelper('crud-collection-default', ctx => resourceName => {
      return new StateCollection(resourceName, ctx);
    });

    addHelper('crud-auth-default', ctx => () => {
      return new LoloAuth(ctx);
    });
  };

  return {
    addResource
  };
};

const singleton = getInstance();

module.exports = {
  addResource: singleton.addResource,
  getInstance,
  Collection,
  Auth
};
