routerAdd(
  'POST',
  '/backend/v1/pre-register-user',
  (e) => {
    try {
      const body = e.requestInfo().body || {}
      const email = (body.email || '').trim().toLowerCase()
      const name = body.name || ''

      if (!email) return e.badRequestError('Email is required')

      try {
        $app.findAuthRecordByEmail('_pb_users_auth_', email)
        return e.json(409, { error: 'User with this email already exists' })
      } catch (_) {}

      const users = $app.findCollectionByNameOrId('_pb_users_auth_')
      const record = new Record(users)
      record.setEmail(email)
      record.setPassword($security.randomString(32))
      record.setVerified(false)
      if (name) record.set('name', name)
      $app.save(record)

      return e.json(201, { id: record.id, email: email, name: name })
    } catch (err) {
      $app.logger().error('pre_register_user — failed', 'error', String(err))
      return e.json(500, { error: 'Failed to pre-register user' })
    }
  },
  $apis.requireAuth(),
)
