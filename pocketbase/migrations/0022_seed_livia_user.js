migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'livia.santana@re.green')
      return
    } catch (_) {}

    const record = new Record(users)
    record.setEmail('livia.santana@re.green')
    record.setPassword('Skip@Pass')
    record.setVerified(true)
    record.set('name', 'Livia Santana')
    app.save(record)
  },
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'livia.santana@re.green')
      app.delete(record)
    } catch (_) {}
  },
)
