const axios = require('axios');
const lodash = require('lodash');
const Auth = require('./auth');

const cache = {};

class LoloAuth extends Auth {
  constructor(ctx) {
    super(ctx);
    const { env } = ctx;

    this.url = (env.LO_AUTH_API || env.LO_API || 'https://dev.lolo.company/api') + '/session';
    this.log = ctx.log;

    this.cacheTTL = (env.SESSION_CACHE_MS && !isNaN(env.SESSION_CACHE_MS)) ?
      parseInt(env.SESSION_CACHE_MS) :
      60 * 1000;
  }

  async getSession(headers) {
    const authHeaders = lodash.pick(headers || {}, [
      'authorization',
      'lolo-account-id',
      'lolo-api-key'
    ]);

    // Stable cache key independent of object key insertion order.
    const key = JSON.stringify([
      authHeaders.authorization || '',
      authHeaders['lolo-account-id'] || '',
      authHeaders['lolo-api-key'] || ''
    ]);
    if (cache[key]) return cache[key];

    const opts = {
      url: this.url,
      headers: authHeaders,
      json: true
    };

    try {
      const res = await axios(opts);
      cache[key] = res.data;

      setTimeout(() => {
        delete cache[key];
      }, this.cacheTTL);

      return cache[key];

    } catch (err) {
      err.status = err.response ? err.response.status : 500;

      if (err.status === 401) {
        err.message = 'unauthorized';
      }

      throw err;
    }
  }
}

module.exports = LoloAuth;
