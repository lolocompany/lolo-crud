const assert = require('chai').assert;
const { initHelper, assertItemResponse } = require('./helpers');
const { params } = require('./fixtures');

describe('refcheck', () => {
  let postCrud, authorCrud;

  beforeEach(() => {
    const h = initHelper({ log: false });

    authorCrud = h.addResource(params.author);
    postCrud = h.addResource(params.post);
    h.init();
  });

  /*
   * Post can't reference non-existent author
   */

  it('post cannot reference non-existent author', async() => {
    const aBody = { name: 'Aldus Dumbledore' };
    const aRes = await authorCrud.request('create', { body: aBody });

    const pBody = { title: 'Pig Tatoos', authorId: 'invalid' };
    await postCrud.request('create', { body: pBody })
      .then(() => {
        throw new Error('create was not supposed to succeed');
      })
      .catch(err => {
        assert.strictEqual(err.status, 422);
      });

    pBody.authorId = aRes.body.id;
    const pRes = await postCrud.request('create', { body: pBody });
    await assertItemResponse(postCrud, pRes, pBody, 202);
  });

  /*
   * Author with posts cannot be deleted with reject strategy
   */

  it('author with posts cannot be deleted with reject strategy', async() => {
    const aBody = { name: 'Aldus Dumbledore' };
    const aRes = await authorCrud.request('create', { body: aBody });

    const pBody = { title: 'Pig Tatoos', authorId: aRes.body.id };
    await postCrud.request('create', { body: pBody });

    await authorCrud.request('delete', { params: { id: aRes.body.id }})
      .then(() => {
        throw new Error('delete was not supposed to succeed');
      })
      .catch(err => {
        assert.strictEqual(err.status, 422);
      });
  });
});
