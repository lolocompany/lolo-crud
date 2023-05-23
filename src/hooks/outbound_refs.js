async function checkOutboundRefs(ev, ctx) {
  const { item, session, crud } = ev;

  for (const ref of crud.getRefs('out')) {
    const ids = [].concat(item[ref.fk]);

    if (!ref.crud) return; // account

    const { body } = await ref.crud.request('list', {
      session,
      query: {
        q: { id: ids },
        pick: [ 'id' ]
      }
    });

    const items = body[ref.crud.resourceNamePlural];

    for (const id of ids) {
      const item = items.find(item => item.id === id);
      if (item) continue;

      ctx.fail(`${ref.resourceName} with id ${id} does not exist`);
    }
  }
}

module.exports = checkOutboundRefs;
