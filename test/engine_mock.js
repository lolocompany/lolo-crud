const crudLib = require('../src');

const getState = () => ({
  db: {},
  get(key) {
    return this.db[key];
  },
  set(key, value) {
    if (value === null) delete this.db[key];
    else this.db[key] = value;
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
    return JSON.parse(headers.authorization);
  }
}

module.exports = (resourceName, schema, opts = {}) => {
  const log = {
    info: opts.log ? console.log : () => {}
  };

  const params = {
    resourceName,
    schema,
    collectionHelper: 'crud-collection-default',
    authHelper: 'crud-auth-mock',
  };

  const baseContext = {
    params,
    log,
    fail: (msg, status = 500) => {
      const err = new Error(msg);
      err.status = status;
      throw err;
    }
  };

  const ctx = {
    ...baseContext,
    state: getState(),
    authMock: ctx => {}
  };

  const bCtx = {
    ...baseContext,
    addHelper(name, cb) {
      ctx[name] = cb(ctx);
    }
  };

  bCtx.addHelper('crud-auth-mock', ctx => () => {
    return new AuthMock(ctx);
  });

  const session = {
    accountId: '000000000000000000000',
    email: 'mock@fakeville.co',
  };

  const headers = { authorization: JSON.stringify(session)};

  return { bCtx, ctx, session, headers };
};
