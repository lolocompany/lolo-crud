async function list(ev, ctx) {
  const { query, accountFilter } = ev;
  const { resourceNamePlural } = this.crud;

  const { items, total } = await this.collection.findByQueryString(
    query,
    accountFilter
  );

  ev.items = items;
  ev.total = total;

  await this.preHook('response');

  return {
    body: {
      [resourceNamePlural]: items,
      count: items.length,
      total
    }
  };
}

module.exports = list;
