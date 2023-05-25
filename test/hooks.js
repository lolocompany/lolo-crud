const assert = require('chai').assert;
const { initHelper, params, assertItemResponse, deepClone } = require('./helpers');
const { stages } = require('../src/hooks');

const body = { name: 'Ginny Weasley' };

describe('hooks', () => {
  let crud;

  beforeEach(() => {
    const h = initHelper({ log: true });
    crud = h.addResource(params.author);
  });

  /*
   * Check that registered pre / post hooks are called
   */

  it('calls all the hooks', async() => {
    const hookEvents = [];

    const onCall = stage => ({ crud, ...ev}) => {
      hookEvents.push(deepClone({ stage, ...ev}));
    };

    for (const stage of stages) {
      crud.preHook('auth', 'create', onCall('pre'  + stage));
      crud.postHook(stage, 'create', onCall('post' + stage));
    }

    const cRes = await crud.request('create', { body });
    assert.strictEqual(stages.length * 2, hookEvents.length);
    await assertItemResponse(crud, cRes, body, 202);
  });

  /*
   * Check that hook can modify event
   */

  it('hook modifies event', async() => {
    crud.postHook('auth', 'create', ev => {
      ev.session.email = 'changed';
    });

    const cRes = await crud.request('create', { body });
    assert.strictEqual(cRes.body.createdBy, 'changed', 'email was not updated');
  });
});
