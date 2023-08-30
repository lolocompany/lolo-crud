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

  buildDependencyMap(log) {
    if (this.dependencyMap) {
      return;

    } else {
      this.dependencyMap = { inbound: {}, outbound: {}};
    }

    const { byResourceName, dependencyMap: { inbound, outbound }} = this;

    for (const [ resourceName, crud ] of Object.entries(byResourceName)) {
      traverse(crud.schema.properties).forEach(function() {
        const match = (this.key || '').match(/^(.*)Ids?$/);
        if (!match) return;

        const foreignResourceName = match[1];
        const refCheck = getRefCheck(this, resourceName);

        if (!byResourceName[foreignResourceName]) {
          return; // not a crud resource
        }

        inbound[foreignResourceName] = inbound[foreignResourceName] || [];
        inbound[foreignResourceName].push({
          resourceName,
          refCheck,
          fk: this.key,
          crud
        });

        outbound[resourceName] = outbound[resourceName] || [];
        outbound[resourceName].push({
          resourceName: foreignResourceName,
          refCheck,
          fk: this.key,
          crud: byResourceName[foreignResourceName]
        });
      });
    }
    logDependencyMap(this.dependencyMap, log);
  }
}

const setStrategies = [ 'reject', 'allow' ];
const deleteStrategies = [ 'reject', 'orphan', 'cascade', 'allow' ];

const getRefCheck = (ctx, resourceName) => {
  const refCheck = {
    set: 'reject',
    delete: 'reject',
    ...ctx.node.refCheck
  };

  if (!setStrategies.includes(refCheck.set)) {
    throw new Error('unsupported refCheck.set ' + refCheck.set);
  }

  if (!deleteStrategies.includes(refCheck.delete)) {
    throw new Error('unsupported refCheck.delete ' + refCheck.delete);
  }

  if (refCheck.delete === 'orphan') {
    const required = ctx.parent.parent.node.required || [];

    if (required.includes(ctx.key)) throw new Error(
      `orphan used for required field ${resourceName}.${ctx.key}`
    );
  }

  return refCheck;
};

function logDependencyMap(map, log) {
  let res = '';

  for (const direction in map) {
    res += '\n' + direction + ':\n' + Array(46).fill('-').join('') + '\n';

    const entries = Object.entries(map[direction]).sort((a, b) => {
      if (a[0] < b[0]) {
        return -1;
      }
      if (a[0] > b[0]) {
        return 1;
      }
      return 0;
    });

    for (const [ name, arr ] of entries) {
      for (const ref of arr) {
        res += (
          name.padEnd(20) +
          ref.resourceName.padEnd(20) +
          ref.refCheck[(direction === 'inbound' ? 'delete' : 'set')] +
          '\n'
        );
      }
    }
  }

  log.info(res);
}
module.exports = CrudRegistry;
