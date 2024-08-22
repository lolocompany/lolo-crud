const axios = require('axios');
const lodash = require('lodash');
const Auth = require('./auth');

const cache = {};
const cacheTTL = 5 * 60 * 1000;

class LoloAuth extends Auth {
  constructor(ctx) {
    super(ctx);
    const { env } = ctx;

    this.url = (env.LO_AUTH_API || env.LO_API || 'https://dev.lolo.company/api') + '/session';
    this.log = ctx.log;
  }

  async getSession(headers) {
    headers = lodash.pickBy(headers, (v, k) => {
      return k === 'authorization' || /^lolo-/.test(k);
    });

    const key = JSON.stringify(headers);
    if (cache[key]) return cache[key];

    const opts = {
      url: this.url,
      headers,
      json: true
    };

    try {
      const res = await axios(opts);
      cache[key] = res.data;
      setTimeout(() => { delete cache[key]; }, cacheTTL);
      return res.data;

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
