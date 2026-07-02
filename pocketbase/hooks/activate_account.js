routerAdd('POST', '/backend/v1/activate-account', (e) => {
  try {
    const body = e.requestInfo().body || {}
    const email = (body.email || '').trim().toLowerCase()
    const password = body.password || ''

    if (!email || !password) return e.badRequestError('Email and password are required')
    if (password.length < 8) return e.badRequestError('Password must be at least 8 characters')

    var record
    try {
      record = $app.findAuthRecordByEmail('_pb_users_auth_', email)
    } catch (_) {
      return e.json(404, {
        error: 'Access restricted to invited users. Please contact your administrator.',
      })
    }

    if (record.getBool('verified')) {
      return e.json(400, { error: 'This account is already activated. Please log in.' })
    }

    record.setPassword(password)
    record.setVerified(true)
    $app.save(record)

    return e.json(200, { success: true })
  } catch (err) {
    $app.logger().error('activate_account — failed', 'error', String(err))
    return e.json(500, { error: 'Failed to activate account' })
  }
})
