const assert = require('chai').assert;
const { initHelper, params } = require('./helpers');

describe('list', () => {
  let crud;

  beforeEach(() => {
    const h = initHelper({ log: true });
    crud = h.addResource(params.author);
  });

  /*
   * Using most of the query string features
   */

  it('full monty', async() => {
    const cRes = [];
    for (let i = 0; i < 10; i++) cRes.push(
      await crud.request('create', { body: { name: '' + (i + 1) }})
    );
    const lRes = await crud.request('list', {
      query: {
        q: { name: [ '2', '3', '4', '5', '6' ] },
        qor: true,
        offset: 1, limit: 3,
        sort: 'name desc',
        pick: [ 'id', 'name' ]
      }
    });
    const lItems = lRes.body[crud.resourceNamePlural]; // [ 5, 4, 3 ]
    assert.strictEqual(lRes.status, 200);
    assert.isArray(lItems);
    assert.lengthOf(lItems, 3);
    assert.include(cRes[2].body, lItems[2]); // [ 3 ]
  });
});
