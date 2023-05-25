const pluralize = require('pluralize');

async function checkInboundRefs(ev, ctx) {
  const { item, crud } = ev;

  for (const ref of crud.getRefs('inbound')) {
    const refIds = await findIds(ref.crud.collection, { [ref.fk]: item.id });

    if (refIds.length && ref.refCheck.delete !== 'allow') {
      await handleDeleteStrategy(crud, ref, refIds, ctx);
    }
  }
}

const findIds = async(collection, filter) => {
  const items = await collection.find(filter);
  return items.map(item => item.id);
};

const handleDeleteStrategy = async(crud, ref, refIds, ctx) => {
  const strategy = ref.refCheck.delete;

  switch (strategy) {
    case 'reject':
      ctx.fail(buildErrorMsg(crud, ref, refIds), 422);
      break;

    case 'orphan':
      throw new Error('orphan not implemented');

    case 'cascade':
      for (const id of refIds) {
        await ref.crud.request('delete', { params: { id }});
      }
      break;

    default:
      throw new Error('invalid refCheck.delete ' + strategy);
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

const buildErrorMsg = (crud, ref, [ firstId, ...restIds ]) => {
  let msg = `${crud.resourceName} is referenced by `;

  if (restIds.length) {
    msg += `${firstId} and ${restIds.length} `;
    msg += `more ${pluralize(ref.resourceName, restIds.length)} `;

  } else {
    msg += `${ref.resourceName} ${firstId} `;
  }

  msg += 'and cannot be deleted';
  return msg;
};

module.exports = checkInboundRefs;
