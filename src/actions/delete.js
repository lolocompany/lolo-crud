async function _delete(ev, ctx) {
  const { item } = ev;

  await this.withHooks('validate', async() => {
  });

  await this.withHooks('save', async() => {
    await this.collection.deleteOne(item);
  });

  return {
    status: 204
  };
}

module.exports = _delete;
