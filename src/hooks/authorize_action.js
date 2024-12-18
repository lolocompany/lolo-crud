
function authorizeAction(ev, ctx) {
  const { params, fail } = ctx;
  const { crudAction, crud, session } = ev;

  let allow = false;

  if (!params.authorize) {
    // authorization disabled
    allow = true;

  } else if (crudAction === 'schema') {
    // allow all schema requests
    allow = true;

  } else if (session.permissions) {
    // new rbac
    const rbacAction = crudAction === 'patch' ? 'update' : crudAction;

    for (const { actions, resources } of session.permissions || []) {
      if (actions.includes(rbacAction) && resources.includes(crud.resourceName)) {
        allow = true;
        break;
      }
    }

  } else if (session.role) {
    // legacy role
    if (session.role === 'write' || ['read', 'list'].includes(crudAction)) {
      allow = true;
    }
  }

  if (!allow) {
    fail('Forbidden', 403);
  }
}

module.exports = authorizeAction;
