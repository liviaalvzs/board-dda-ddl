migrate(
  (app) => {
    const adminEmails = ['maria.palma@re.green', 'lucas.lamare@re.green', 'livia.santana@re.green']

    const users = app.findRecordsByFilter('users', '1=1', '', 0, 0)
    for (const user of users) {
      const email = (user.getString('email') || '').toLowerCase().trim()
      const newRole = adminEmails.indexOf(email) !== -1 ? 'admin' : 'negociador'
      if (user.getString('role') !== newRole) {
        user.set('role', newRole)
        app.save(user)
      }
    }
  },
  (app) => {
    // rollback: set all back to admin
    const users = app.findRecordsByFilter('users', '1=1', '', 0, 0)
    for (const user of users) {
      user.set('role', 'admin')
      app.save(user)
    }
  },
)
