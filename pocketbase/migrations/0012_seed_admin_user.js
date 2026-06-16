migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'admin@regreen.earth')
      return
    } catch (_) {}

    const record = new Record(users)
    record.setEmail('admin@regreen.earth')
    record.setPassword('Skip@Pass')
    record.setVerified(true)
    record.set('name', 'Administrator')
    app.save(record)
  },
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'admin@regreen.earth')
      app.delete(record)
    } catch (_) {}
  },
)
