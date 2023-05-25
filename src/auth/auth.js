/*
 * Base class for Auth providers
 */

class Auth {
  constructor(ctx) {
  }

  async getSession(headers) {
  }
}

module.exports = Auth;
