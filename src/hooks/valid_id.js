const RESERVED_IDS = new Set(['all', 'export']);

async function validId(ev, ctx) {
  const { item, crud } = ev;

  if (RESERVED_IDS.has(item.id)) {
    ctx.fail('id is not valid', 422);
  }

  const otherItem = await crud.collection.findOne({ id: item.id });
  if (otherItem) ctx.fail('id should be unique', 422);
}

module.exports = validId;
