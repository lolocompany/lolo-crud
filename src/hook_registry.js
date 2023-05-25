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

HookRegistry.actions = actions;
HookRegistry.stages = stages;

module.exports = HookRegistry;
