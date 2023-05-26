async function checkOutboundRefs(ev, ctx) {
  const { item, session, crud } = ev;
  const { fail } = ctx;

  for (const ref of crud.getRefs('outbound')) {
    const ids = [].concat(item[ref.fk]);

    if (ref.refCheck.allow === 'allow') return;

    if (ref.fk === 'accountId') {
      // Users can't access their account via API, use collection
      const account = ref.collection.findOne({ id: ids[0] });
      if (account) return;
      fail(`account ${ids[0]} does not exist`, 422);
    }

    // Use API so any custom authorization logic is applied
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

      fail(`${ref.resourceName} ${id} does not exist`, 422);
    }
  }
}

module.exports = checkOutboundRefs;
