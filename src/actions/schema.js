async function schema(ev, ctx) {
  return {
    body: this.crud.schema
  };
}

module.exports = schema;
