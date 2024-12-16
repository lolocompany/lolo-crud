const pluralize = require('pluralize');

async function checkInboundRefs(ev, ctx) {
  const { item, crud, session } = ev;

  for (const ref of crud.getRefs('inbound')) {

    if (ref.refCheck.delete === 'allow') continue;

    // Use API so any custom authorization logic is applied
    const { body } = await ref.crud.request('list', {
      session,
      query: {
        q: { [ref.fk]: item.id },
        pick: [ 'id' ],
        limit: 500
      }
    });

    const items = body[ref.crud.resourceNamePlural];

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
      await ref.crud.collection.orphan(ref.fk, item.id);
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
