async function read(ev, ctx) {
  const { item } = ev;

  return {
    status: 200,
    body: item
  };
}

module.exports = read;
