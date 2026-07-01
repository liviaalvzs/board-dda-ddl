routerAdd(
  'GET',
  '/backend/v1/users',
  (e) => {
    try {
      const records = $app.findRecordsByFilter('users', "id != ''", 'name', 200, 0)
      var users = []
      for (var i = 0; i < records.length; i++) {
        var r = records[i]
        users.push({
          id: r.id,
          name: r.getString('name') || r.getString('email') || 'Usuário',
          email: r.getString('email') || '',
        })
      }
      return e.json(200, { items: users })
    } catch (err) {
      $app.logger().error('users_list — failed to list users', 'error', String(err))
      return e.json(500, { error: 'Failed to list users' })
    }
  },
  $apis.requireAuth(),
)
