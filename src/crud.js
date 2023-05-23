const pluralize = require('pluralize');

const { withCrudProps } = require('./schema');
const Controller = require('./controller');
const refs = require('./refs');

class Crud {
  constructor(params, log) {
    this.params = params;
    this.log = log;

    this.resourceName = params.resourceName;
    this.resourceNamePlural = pluralize(this.resourceName);
    this.schema = withCrudProps(params.schema);

    this.controller = new Controller(this);
    this.collection = null;
  }

  init(ctx) {
    const { collectionHelper, resourceName } = ctx.params;

    this.collection = ctx[collectionHelper](resourceName, ctx);
    this.controller.init(ctx);

    if (!this.constructor.dependencyMap) {
      this.constructor.buildDependencyMap();
      this.log.info('dependencyMap', this.constructor.dependencyMap);
    }
  }

  preHook(...args) {
    return this.controller.preHooks.add(...args);
  }

  request(action, ev, ctx) {
    return this.controller.run(action, ev, ctx);
  }
}

refs.mixin(Crud);

module.exports = Crud;
