const pluralize = require('pluralize');

const { withCrudProps } = require('./schema');
const Controller = require('./controller');

class Crud {
  constructor(params, log, registry) {
    this.params = params;
    this.log = log;
    this.registry = registry;

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
    this.registry.buildDependencyMap(this.log);
  }

  preHook(...args) {
    return this.controller.preHooks.add(...args);
  }

  postHook(...args) {
    return this.controller.postHooks.add(...args);
  }

  request(action, ev, ctx) {
    return this.controller.run(action, ev, ctx);
  }

  getRefs(direction) {
    const { registry: { dependencyMap }, resourceName } = this;
    return dependencyMap[direction][resourceName] || [];
  }

  toJSON() {
    return {}; // cyclic references
  }
}

module.exports = Crud;
