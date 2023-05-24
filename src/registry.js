const traverse = require('traverse');

class CrudRegistry {
  constructor() {
    this.byResourceName = {};
    this.dependencyMap = null;
  }

  addCrud(crud) {
    const { byResourceName } = this;

    if (byResourceName[crud.resourceName]) {
      throw new Error('crud for ' + crud.resourceName + ' already exists');
    }

    this.byResourceName[crud.resourceName] = crud;
  }

  getCrud(resourceName) {
    const crud = this.byResourceName[resourceName];
    if (crud) return crud;

    throw new Error('crud ' + resourceName + ' not found');
  }

  /*
   * Analyze crud schemas to build a map of parent resources and their children
   *
   * in: {
   *   author: { post: { fk: 'postId', crud, refCheck: { set: true, delete: 'reject' }}}
   * },
   * out: {
   *   post: { author: { fk: 'postId', crud, refCheck: { set: true, delete: 'reject' }}}
   * }
   }
   */

  buildDependencyMap() {
    if (this.dependencyMap) {
      return;

    } else {
      this.dependencyMap = { in: {}, out: {}};
    }

    const { byResourceName, dependencyMap } = this;

    for (const [ resourceName, crud ] of Object.entries(byResourceName)) {
      traverse(crud.schema).forEach(function() {
        const match = (this.key || '').match(/^(.*)Ids?$/);
        if (!match) return;

        const foreignResourceName = match[1];
        const refCheck = getRefCheck(this, resourceName);

        dependencyMap.in[foreignResourceName] = {
          ...dependencyMap.in[foreignResourceName],
          [resourceName]: {
            refCheck,
            fk: this.key,
            crud
          }
        };

        dependencyMap.out[resourceName] = {
          ...dependencyMap.out[resourceName],
          [foreignResourceName]: {
            refCheck,
            fk: this.key,
            crud: byResourceName[foreignResourceName]
          }
        };
      });
    }
  }
}

const getRefCheck = (ctx, resourceName) => {
  const refCheck = {
    ...ctx.node.refCheck,
    set: 'reject',
    delete: 'reject'
  };

  if (refCheck.delete === 'orphan') {
    const required = ctx.parent.parent.node.required || [];

    if (required.includes(ctx.key)) throw new Error(
      `orphan used for required field ${resourceName}.${ctx.key}`
    );
  }

  return refCheck;
};

module.exports = CrudRegistry;
