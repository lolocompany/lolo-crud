const assert = require('chai').assert;
const { initHelper, params, assertItemResponse } = require('./helpers');

const body = { name: 'Sirius Black' };

describe('crud', () => {
  let crud;

  beforeEach(() => {
    const h = initHelper({ log: true });
    crud = h.addResource(params.author);
  });

  /*
   * Create
   */

  it('create', async() => {
    const cRes = await crud.request('create', { body });
    await assertItemResponse(crud, cRes, body, 202);
  });

  /*
   * Update
   */

  it('update', async() => {
    const cRes = await crud.request('create', { body });
    const uBody = { ...cRes.body, name: 'changed' };
    const uRes = await crud.request('update', {
      params: { id: cRes.body.id },
      body: uBody
    });
    await assertItemResponse(crud, uRes, uBody, 200);
  });

  /*
   * Delete
   */

  it('delete', async() => {
    const cRes = await crud.request('create', { body });
    const dRes = await crud.request('delete', {
      params: { id: cRes.body.id }}
    );
    assert.strictEqual(dRes.status, 204);
    assert.isUndefined(dRes.body);
  });

  /*
   * Patch
   */

  it('patch', async() => {
    const res = await crud.request('create', { body });
    const pBody = { name: 'changed' };
    const pRes = await crud.request('update', {
      params: { id: res.body.id },
      body: pBody }
    );
    await assertItemResponse(crud, pRes, pBody, 200);
  });
});
