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

const params = {
  author: {
    resourceName: 'author',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' }
      },
      required: [ 'name' ]
    }
  },
  post: {
    resourceName: 'post',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        body:  { type: 'string' }
      },
      required: [ 'title' ]
    }
  },
  comment: {
    resourceName: 'comment',
    schema: {
      type: 'object',
      properties: {
        body: { type: 'string' },
      },
      required: [ 'body' ]
    }
  },
};

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

  return {
    addResource: params => {
      params = {
        ...params,
        collectionHelper: 'crud-collection-default',
        authHelper: 'crud-auth-mock',
      };

      crudLib.getInstance().addResource({ ...setupContext, params });

      const crud = handlerContext.getCrud(params.resourceName);
      crud.init({ ...handlerContext, params });
      return crud;
    },
    state: handlerContext.state.db
  };
};

async function assertItemResponse(res, body = {}, status = 200) {
  const { version, updatedAt, ...compareBody } = body; // eslint-disable-line
  assert.strictEqual(res.status, status);
  assert.isObject(res.body);
  assert.include(res.body, compareBody);

  const readRes = await this.crud.request('read', { params: { id: res.body.id }});
  assert.deepStrictEqual(res.body, readRes.body);
}

module.exports = {
  initHelper,
  params,
  assertItemResponse
};
