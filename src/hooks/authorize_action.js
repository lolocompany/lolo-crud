
function authorizeAction(ev, ctx) {
  const { params, fail, log } = ctx;
  const { crudAction, crud, session, crudSkipAuthorize } = ev;

  let allow = false;

  if (!params.authorize || crudSkipAuthorize) {
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
    log.info('rejected', crudAction, crud.resourceName, 'for', session.email);
    fail('Forbidden', 403);
  }
}

module.exports = authorizeAction;
