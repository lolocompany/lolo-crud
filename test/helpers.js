const assert = require('chai').assert;
const crudLib = require('../src');

const getState = () => ({
  db: {},
  get(key) {
    return this.db[key];
  },
  set(key, value) {
    if (value === null) delete this.db[key];
    else this.db[key] = JSON.parse(JSON.stringify(value));
    return value;
  },
  keys(re = /.*/) {
    return Object.keys(this.db).filter(key => re.test(key));
  }
});

class AuthMock extends crudLib.Auth {
  constructor(ctx) {
    super(ctx);
  }
  async getSession(headers) {
    return {
      accountId: '000000000000000000000',
      email: 'test@mock.co',
    };
  }
}

const initHelper = (opts = {}) => {
  const log = {
    info: opts.log ? console.log : () => {}
  };

  const baseContext = {
    params: {},
    log,
    fail: (msg, status = 500) => {
      const err = new Error(msg);
      err.status = status;
      throw err;
    }
  };

  const handlerContext = {
    ...baseContext,
    state: getState(),
    authMock: ctx => {}
  };

  const setupContext = {
    ...baseContext,
    addHelper(name, cb) {
      handlerContext[name] = cb(handlerContext);
    }
  };

  setupContext.addHelper('crud-auth-mock', ctx => () => {
    return new AuthMock(ctx);
  });

  const instance = crudLib.getInstance();

  return {
    addResource: params => {
      params = {
        ...params,
        collectionHelper: 'crud-collection-default',
        authHelper: 'crud-auth-mock',
      };

      instance.addResource({ ...setupContext, params });

      const crud = handlerContext.getCrud(params.resourceName);
      crud.init({ ...handlerContext, params });
      return crud;
    },
    state: handlerContext.state.db
  };
};

async function assertItemResponse(crud, res, body = {}, status = 200) {
  const { version, updatedAt, ...compareBody } = body; // eslint-disable-line
  assert.strictEqual(res.status, status);
  assert.isObject(res.body);
  assert.include(res.body, compareBody);

  const readRes = await crud.request('read', { params: { id: res.body.id }});
  assert.deepStrictEqual(res.body, readRes.body);
}

module.exports = {
  initHelper,
  assertItemResponse,
  deepClone: obj => JSON.parse(JSON.stringify(obj))
};
