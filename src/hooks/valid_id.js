async function validId(ev, ctx) {
  const { item, crud } = ev;

  if (item.id === 'all') {
    ctx.fail('id is not valid', 422); // reserved for /accounts/all etc
  }

  const otherItem = await crud.collection.findOne({ id: item.id });
  if (otherItem) ctx.fail('id should be unique', 422);
}

module.exports = validId;
