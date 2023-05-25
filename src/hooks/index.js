const versionConflict = require('./version_conflict');
const uniqueId = require('./unique_id');
const checkOutboundRefs = require('./outbound_refs');
const checkInboundRefs = require('./inbound_refs');

module.exports = {
  versionConflict,
  uniqueId,
  checkInboundRefs,
  checkOutboundRefs
};
