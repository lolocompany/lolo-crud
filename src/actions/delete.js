async function _delete(ev, ctx) {
  const { item } = ev;

  await this.preHook('save');
  await this.collection.deleteOne(item);

  await this.preHook('response');

  return {
    status: 204
  };
}

module.exports = _delete;
