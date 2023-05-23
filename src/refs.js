const traverse = require('traverse');
const lodash = require('lodash');

function getRefs(direction) {
  const { resourceName, constructor } = this;

  const map = lodash.get(constructor.dependencyMap, [ direction, resourceName  ], {});

  return Object.entries(map).reduce((memo, [ resourceName, ref ]) => {
    return memo.concat({ resourceName, ...ref });
  }, []);
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

function buildDependencyMap() {
  this.dependencyMap = {
    in:  {},
    out: {}
  };

  const { dependencyMap, byResourceName } = this;

  for (const [ resourceName, crud ] of Object.entries(byResourceName)) {
    traverse(crud.schema).forEach(function() {
      const match = (this.key || '').match(/^(.*)Ids?$/);
      if (!match) return;

      const foreignResourceName = match[1];
      const refCheck = getRefCheck(this, resourceName);

      dependencyMap['in'][foreignResourceName] = {
        ...dependencyMap['in'][foreignResourceName],
        [resourceName]: {
          refCheck,
          fk: this.key,
          crud
        }
      };

      dependencyMap['out'][resourceName] = {
        ...dependencyMap['out'][resourceName],
        [foreignResourceName]: {
          refCheck,
          fk: this.key,
          crud: byResourceName[foreignResourceName]
        }
      };
    });
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

module.exports = {
  mixin: Crud => {
    Crud.prototype.getRefs = getRefs;
    Crud.buildDependencyMap = buildDependencyMap;
  }
};
