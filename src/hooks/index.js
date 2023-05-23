const Registry = require('./registry');

const versionConflict = require('./version_conflict');
const uniqueId = require('./unique_id');
const checkOutboundRefs = require('./outbound_refs');
const checkInboundRefs = require('./inbound_refs');

const addHook = (controller, stage, action, fn) => {
  controller.preHooks.add(stage, action, fn.bind(controller));
};

module.exports = {
  Registry,
  addDefault: controller => {
    addHook(controller, 'save', 'update', versionConflict);
    addHook(controller, 'save', 'create', uniqueId);
    addHook(controller, 'save', /create|patch|update/, checkOutboundRefs);
    addHook(controller, 'save', 'delete', checkInboundRefs);
  }
};
