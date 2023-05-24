const assert = require('chai').assert;
const engineMock = require('./engine_mock');
const crudLib = require('../src');

const resourceName = 'post';

const schema = {
  type: 'object',
  properties: {
    title: { type: 'string' }
  },
  required: [ 'title' ]
};

const { bCtx, ctx, headers } = engineMock(resourceName, schema, { log: false });
crudLib.addResource(bCtx);

describe('initialization', () => {
  let crud;

  it('getCrud returns a crud api', async() => {
    crud = ctx.getCrud(resourceName);
    assert.isObject(crud);
    assert.strictEqual(crud.resourceName, resourceName);
  });

  it('crud.init initializes the crud api', async() => {
    crud.init(ctx);
    assert.isObject(crud.collection);
  });
});

describe('crud', () => {
  let crud;

  beforeEach(() => {
    crud = ctx.getCrud(resourceName);
    crud.init(ctx);
  });

  it('create', async() => {
    const ev = { headers, body: { title: 'Pig tatoos' }};
    const { status, body } = await crud.request('create', ev, ctx);

    assert.strictEqual(status, 202);
    assert.isObject(body);
  });

  it('creates with id', async() => {
    const id = 'my-id';
    const ev = { headers, body: { id, title: 'Pig tatoos' }};
    const { status, body } = await crud.request('create', ev, ctx);

    assert.strictEqual(status, 202);
    assert.isObject(body);
    assert.strictEqual(body.id, id);
  });
});

describe('crud', () => {
  let crud;
  let item;

  beforeEach(async() => {
    crud = ctx.getCrud(resourceName);
    crud.init(ctx);

    const ev = { headers, body: { title: 'Pig tatoos' }};
    const { body } = await crud.request('create', ev, ctx);
    item = body;
  });

  it('read', async() => {
    const ev = { headers, params: { id: item.id }};
    const { status, body } = await crud.request('read', ev, ctx);

    assert.strictEqual(status, 200);
    assert.isObject(body);
  });

  it('update', async() => {
    const newTitle = 'updated';

    const ev = { headers, params: { id: item.id }, body: { ...item, title: newTitle }};
    const { status, body } = await crud.request('update', ev, ctx);

    assert.strictEqual(status, 200);
    assert.strictEqual(body.title, newTitle);
  });
});


/*
  it('read returns the item', async() => {
    const ev = { headers, params: { id: item.id }};
    const { status, body } = await crud.request('read', ev, ctx);

    assert.strictEqual(status, 200);
    assert.isObject(body);
    assert.deepStrictEqual(body, item);
  });

  it('updates the item', async() => {
    const title = 'updated';
    const ev = { headers, params: { id: item.id }, body: { ...item, title }};
    const { status, body } = await crud.request('update', ev, ctx);

    assert.strictEqual(status, 200);
    assert.isObject(body);
    assert.strictEqual(body.title, title);
  });

  after(() => {
    console.log('\nstate:');
    console.log(ctx.state.db);
  });
});

*/
