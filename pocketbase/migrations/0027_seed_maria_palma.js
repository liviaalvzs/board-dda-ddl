migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'maria.palma@re.green')
      return
    } catch (_) {}

    const record = new Record(users)
    record.setEmail('maria.palma@re.green')
    record.setPassword('Skip@Pass')
    record.setVerified(true)
    record.set('name', 'Maria Palma')
    app.save(record)
  },
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'maria.palma@re.green')
      app.delete(record)
    } catch (_) {}
  },
)
