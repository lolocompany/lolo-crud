async function list(ev, ctx) {
  const { query, accountFilter } = ev;
  const { resourceNamePlural } = this.crud;

  await this.withHooks('load', async() => {
    const { items, total } = await this.collection.findByQueryString(
      query,
      accountFilter
    );

    ev.items = items;
    ev.total = total;
  });

  return {
    status: 200,
    body: {
      [resourceNamePlural]: ev.items,
      count: ev.items.length,
      total: ev.total
    }
  };
}

module.exports = list;
