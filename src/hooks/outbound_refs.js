async function checkOutboundRefs(ev, ctx) {
  const { item, session, crud } = ev;
  const { fail } = ctx;

  for (const ref of crud.getRefs('outbound')) {
    const ids = [].concat(item[ref.fk]).filter(id => !!id);

    if (ref.refCheck.set === 'allow' || ids.length < 1) return;

    if (ref.fk === 'accountId') {
      // Users can't access their account via API, use collection
      const account = ref.crud.collection.findOne({ id: ids[0] });
      if (account) continue;
      fail(`account ${ids[0]} does not exist`, 422);
    }

    // Use API so any custom tenancy logic is applied
    const { body } = await ref.crud.request('list', {
      skipAuthorize: true, // but ignore read permission check
      session,
      query: {
        q: { id: ids },
        pick: [ 'id' ],
        limit: 500,
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
