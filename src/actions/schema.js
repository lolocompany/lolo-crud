async function schema(ev, ctx) {
  return {
    status: 200,
    body: this.crud.schema
  };
}

module.exports = schema;
