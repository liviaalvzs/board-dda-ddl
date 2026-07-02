routerAdd('POST', '/backend/v1/check-email', (e) => {
  try {
    const body = e.requestInfo().body || {}
    const email = (body.email || '').trim().toLowerCase()

    if (!email) return e.badRequestError('Email is required')

    var record
    try {
      record = $app.findAuthRecordByEmail('_pb_users_auth_', email)
    } catch (_) {
      return e.json(404, {
        error: 'Access restricted to invited users. Please contact your administrator.',
      })
    }

    if (record.getBool('verified')) {
      return e.json(200, {
        status: 'active',
        message: 'This account is already activated. Please log in.',
      })
    }

    return e.json(200, { status: 'pending' })
  } catch (err) {
    $app.logger().error('check_email — failed', 'error', String(err))
    return e.json(500, { error: 'Failed to check email' })
  }
})
