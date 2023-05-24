const Registry = require('./registry');

const versionConflict = require('./version_conflict');
const uniqueId = require('./unique_id');
const checkOutboundRefs = require('./outbound_refs');
const checkInboundRefs = require('./inbound_refs');

module.exports = {
  Registry,
  addDefault: controller => {
    const { preHooks, postHooks } = controller;

    postHooks.add('load', 'update', versionConflict);
    preHooks.add('save', 'create', uniqueId);
    preHooks.add('save', /create|patch|update/, checkOutboundRefs);
    preHooks.add('save', 'delete', checkInboundRefs);
  }
};
