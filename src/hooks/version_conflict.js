const statusCodes = require('http-status-codes');

function versionConflict(ev, ctx) {
  const { item, body } = ev;

  if (body.version && body.version !== item.version) {
    ctx.fail('version conflict', statusCodes.CONFLICT);
  }
}

module.exports = versionConflict;
