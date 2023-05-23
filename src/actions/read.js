async function read(ev, ctx) {
  const { item } = ev;

  await this.preHook('response');

  return {
    body: item
  };
}

module.exports = read;
