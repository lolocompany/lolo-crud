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
    case 'allow':
      return;

    case 'reject':
      ctx.fail(buildErrorMsg(crud, ref, refIds), 422);
      break;

    case 'orphan':
      await ref.crud.collection.orphan(refIds, ref.fk, item.id);
      break;

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
