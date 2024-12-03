const versionConflict = require('./version_conflict');
const validId = require('./valid_id');
const checkOutboundRefs = require('./outbound_refs');
const checkInboundRefs = require('./inbound_refs');
const authorizeAction = require('./authorize_action');

const actions = [ 'create', 'read', 'update', 'delete', 'list', 'patch' ];
const stages =  [ 'auth', 'load', 'validate', 'save', 'response' ];

class HookRegistry {
  constructor() {
    this.byKey = {};
  }

  add(stage, actionRe, cb) {
    actionRe = typeof actionRe === 'string' ? new RegExp(`^${actionRe}$`) : actionRe;

    if (!stages.includes(stage)) {
      throw new Error('invalid stage ' + stage);
    }

    for (const action of actions) {
      if (actionRe.test(action)) {
        const key = buildKey(stage, action);
        this.byKey[key] = (this.byKey[key] || []).concat(cb);
      }
    }
  }

  async run(stage, action, ...args) {
    const key = buildKey(stage, action);

    for (const cb of this.byKey[key] || []) {
      await cb(...args);
    }
  }
}

const buildKey = (stage, action) => [ stage, action ].join(':');

module.exports = {
  versionConflict,
  validId,
  checkInboundRefs,
  checkOutboundRefs,
  authorizeAction,
  Registry: HookRegistry,
  stages,
  actions
};
