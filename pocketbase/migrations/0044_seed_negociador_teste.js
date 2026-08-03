migrate(
  (app) => {
    const email = 'negociador.teste@re.green'

    try {
      app.findAuthRecordByEmail('_pb_users_auth_', email)
      return
    } catch (_) {
      // não existe ainda — segue para criação
    }

    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const record = new Record(users)
    record.setEmail(email)
    // Conta de negociador entra pelo e-mail (rota negociador-login), então a
    // senha nunca é usada. Guardamos uma aleatória só para satisfazer o schema.
    record.setPassword($security.randomString(32))
    record.setVerified(true)
    record.set('name', 'Negociador Teste')
    record.set('role', 'negociador')
    app.save(record)
  },
  (app) => {
    try {
      app.delete(app.findAuthRecordByEmail('_pb_users_auth_', 'negociador.teste@re.green'))
    } catch (_) {}
  },
)
