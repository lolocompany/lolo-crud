const Crud = require('./crud');

const { Collection, StateCollection } = require('./collection');
const { Auth, LoloAuth } = require('./auth');

Crud.byResourceName = {};

/*
 *
 */

const addResource = bCtx => {
  const { params, addHelper, log } = bCtx;
  const { resourceName } = params;

  log.info('addResource', params.resourceName);

  if (Crud.byResourceName[resourceName]) {
    throw new Error('crud for ' + resourceName + ' already exists');
  }

  addHelper('getCrud', ctx => (resourceName = ctx.params.resourceName) => {
    const crud = Crud.byResourceName[resourceName];
    if (crud) return crud;

    throw new Error('crud ' + resourceName + ' not found');
  });

  addHelper('crud-collection-default', ctx => resourceName => {
    return new StateCollection(resourceName, ctx);
  });

  addHelper('crud-auth-default', ctx => () => {
    return new LoloAuth(ctx);
  });

  Crud.byResourceName[resourceName] = new Crud(params, log);
};

module.exports = {
  addResource,
  Collection,
  Auth
};
