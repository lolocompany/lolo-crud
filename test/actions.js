const assert = require('chai').assert;
const { initHelper, params, assertItemResponse } = require('./helpers');

const body = { title: 'Pig Tatoos' };

describe('crud', () => {
  beforeEach(() => {
    const h = initHelper({ log: true });
    this.crud = h.addResource(params.post);
    this.assertItemResponse = assertItemResponse.bind(this);
    this.create = () => this.crud.request('create', { body });
  });

  /*
   * Create
   */

  it('create', async() => {
    const cRes = await this.create();
    await this.assertItemResponse(cRes, body, 202);
  });

  /*
   * Read
   */

  it('read', async() => {
    const cRes = await this.create();
    const rRes = await this.crud.request('read', {
      params: { id: cRes.body.id }}
    );
    await this.assertItemResponse(rRes, cRes.body, 200);
  });

  /*
   * Update
   */

  it('update', async() => {
    const cRes = await this.create();
    const uBody = { ...cRes.body, title: 'changed' };
    const uRes = await this.crud.request('update', {
      params: { id: cRes.body.id },
      body: uBody
    });
    await this.assertItemResponse(uRes, uBody, 200);
  });

  /*
   * Delete
   */

  it('delete', async() => {
    const cRes = await this.create();
    const dRes = await this.crud.request('delete', {
      params: { id: cRes.body.id }}
    );
    assert.strictEqual(dRes.status, 204);
    assert.isUndefined(dRes.body);
  });

  /*
   * List
   */

  it('list', async() => {
    const cRes = await this.create();
    const lRes = await this.crud.request('list', { query: {}});
    const items = lRes.body[this.crud.resourceNamePlural];
    assert.strictEqual(lRes.status, 200);
    assert.isArray(items);
    assert.lengthOf(items, 1);
    assert.deepStrictEqual(cRes.body, items[0]);
  });

  /*
   * Patch
   */

  it('patch', async() => {
    const res = await this.crud.request('create', { body });
    const pBody = { title: 'changed' };
    const pRes = await this.crud.request('update', {
      params: { id: res.body.id },
      body: pBody }
    );
    await this.assertItemResponse(pRes, pBody, 200);
  });
});
