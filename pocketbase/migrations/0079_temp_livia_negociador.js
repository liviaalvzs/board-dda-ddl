migrate(
  (app) => {
    const record = app.findAuthRecordByEmail('users', 'livia.santana@re.green')
    record.set('role', 'negociador')
    app.save(record)
  },
  (app) => {
    const record = app.findAuthRecordByEmail('users', 'livia.santana@re.green')
    record.set('role', 'admin')
    app.save(record)
  },
)
