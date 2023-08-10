const pluralize = require('pluralize');

async function checkInboundRefs(ev, ctx) {
  const { item, crud } = ev;

  for (const ref of crud.getRefs('inbound')) {

    if (ref.refCheck.delete === 'allow') continue;

    const items = await ref.crud.collection.find({
      accountId: item.accountId,
      [ref.fk]: item.id
    });

    if (!items.length) continue;

    await handleDeleteStrategy(
      crud,
      ref,
      item,
      items.map(item => item.id),
      ctx);
  }
}

const handleDeleteStrategy = async(crud, ref, item, refIds, ctx) => {
  const strategy = ref.refCheck.delete;

  switch (strategy) {
    case 'reject':
      ctx.fail(buildErrorMsg(crud, ref, refIds), 422);
      break;

    case 'orphan':
      throw new Error('orphan not implemented');

    case 'cascade':
      await ref.crud.collection.deleteMany({
        accountId: item.accountId,
        [ref.fk]: item.id
      });
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
