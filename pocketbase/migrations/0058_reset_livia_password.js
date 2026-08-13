migrate(
  (app) => {
    let record
    try {
      record = app.findAuthRecordByEmail('_pb_users_auth_', 'livia.santana@re.green')
    } catch (_) {
      return
    }
    record.setPassword('Skip@Pass')
    app.save(record)
  },
  (app) => {},
)
