async function read(ev, ctx) {
  const { item } = ev;

  return {
    body: item
  };
}

module.exports = read;
