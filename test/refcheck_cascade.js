const assert = require('chai').assert;
const { initHelper, deepClone } = require('./helpers');
const { params } = require('./fixtures');

describe('refcheck cascade', () => {
  let postCrud, authorCrud;

  beforeEach(() => {
    const h = initHelper({ log: false });

    authorCrud = h.addResource(params.author);

    const paramsWithReject = deepClone(params.post);
    paramsWithReject.schema.properties.authorId.refCheck = { delete: 'cascade' };
    postCrud = h.addResource(paramsWithReject);
    h.init();
  });

  /*
   * Posts are deleted with their author using cascade strategy
   */

  it('posts are deleted with their author', async() => {
    const aBody = { name: 'Aldus Dumbledore' };
    const aRes = await authorCrud.request('create', { body: aBody });

    const pBody = { title: 'Pig Tatoos', authorId: aRes.body.id };
    const pRes = await postCrud.request('create', { body: pBody });

    await authorCrud.request('delete', { params: { id: aRes.body.id }});

    await postCrud.request('read', { params: { id: pRes.body.id }})
      .then(() => {
        throw new Error('read should have failed');
      })
      .catch(err => {
        assert.strictEqual(err.status, 404);
      });
  });
});
