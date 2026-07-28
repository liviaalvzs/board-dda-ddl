migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('document_checks')

    if (!col.fields.getByName('user')) {
      col.fields.add(
        new RelationField({
          name: 'user',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
          cascadeDelete: false,
        }),
      )
    }
    app.save(col)

    var defaultUserId = ''
    try {
      var defaultUser = app.findAuthRecordByEmail('_pb_users_auth_', 'livia.santana@re.green')
      defaultUserId = defaultUser.id
    } catch (_) {
      try {
        var adminUser = app.findAuthRecordByEmail('_pb_users_auth_', 'admin@regreen.earth')
        defaultUserId = adminUser.id
      } catch (_) {}
    }

    if (defaultUserId) {
      try {
        var records = app.findRecordsByFilter('document_checks', 'id != ""', '', 0, 0)
        for (var i = 0; i < records.length; i++) {
          var record = records[i]
          if (!record.getString('user')) {
            record.set('user', defaultUserId)
            app.saveNoValidate(record)
          }
        }
      } catch (_) {}
    }
  },
  (app) => {
    try {
      var col = app.findCollectionByNameOrId('document_checks')
      col.fields.removeByName('user')
      app.save(col)
    } catch (_) {}
  },
)
