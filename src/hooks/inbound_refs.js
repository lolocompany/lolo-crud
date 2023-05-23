const pluralize = require('pluralize');

async function checkInboundRefs(ev, ctx) {
  const { item, crud } = ev;

  for (const ref of crud.getRefs('in')) {
    const refIds = await findIds(ref.crud.collection, { [ref.fk]: item.id });

    if (refIds.length) {
      await handleDeleteStrategy(crud, ref, refIds);
    }
  }
}

const findIds = async(collection, filter) => {
  const items = await collection.find(filter);
  return items.map(item => item.id);
};

const handleDeleteStrategy = (crud, ref, refIds) => {
  const strategy = ref.refCheck.delete;

  switch (strategy) {
    case 'reject':
      this.fail(buildErrorMsg(crud, ref, refIds));
      break;

    case 'orphan':
      throw new Error('orphan not implemented');

    case 'cascade':
      throw new Error('cascade not implemented');

    default:
      break;
  }
};

/*
 * Implementation of the orphan strategy: unset or pull foreign keys
 * in child resources

const handleOrphan = async(crud, ref, refIds) => {
  const op = ref.fk.endsWith('Ids') ? '$pull' : '$unset';
  await ref.crud.collection.updateMany({ id: { $in: refIds }}, { [op]: { [ref.fk]: parentId }});
};
*/

const buildErrorMsg = (crud, ref, refIds) => {
  let msg = `${crud.resourceName} is referenced by `;
  msg += pluralize(ref.resourceName, refIds.length, true);
  msg += ' and cannot be deleted';

  return msg;
};

module.exports = checkInboundRefs;
