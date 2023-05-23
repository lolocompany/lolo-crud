async function uniqueId(ev, ctx) {
  const { item, crud } = ev;

  const otherItem = await crud.collection.findOne({ id: item.id });
  if (otherItem) ctx.fail('id should be unique', 422);
}

module.exports = uniqueId;
