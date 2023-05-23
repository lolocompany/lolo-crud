async function schema(ev, ctx) {
  await this.preHook('response');

  return {
    body: this.crud.schema
  };
}

module.exports = schema;
