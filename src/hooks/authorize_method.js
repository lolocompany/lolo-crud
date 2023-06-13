function authorizeMethod(ev, ctx) {
  const { params, fail } = ctx;
  const { method, session } = ev;

  if (params.authorize && session.role !== 'write') {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      fail('Forbidden', 403);
    }
  }
}

module.exports = authorizeMethod;
