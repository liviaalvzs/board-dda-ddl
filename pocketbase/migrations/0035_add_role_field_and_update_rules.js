migrate(
  (app) => {
    // 1. Add 'role' select field to users collection
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    if (!usersCol.fields.getByName('role')) {
      usersCol.fields.add(
        new SelectField({
          name: 'role',
          required: true,
          values: ['admin', 'negociador'],
          maxSelect: 1,
        }),
      )
    }
    // Update users access rules: list only for admins, view/update own record
    usersCol.listRule = '@request.auth.role = "admin"'
    usersCol.viewRule = '@request.auth.id = id || @request.auth.role = "admin"'
    usersCol.createRule = null
    usersCol.updateRule = '@request.auth.id = id || @request.auth.role = "admin"'
    usersCol.deleteRule = '@request.auth.role = "admin"'
    app.save(usersCol)

    // 2. Update land_metadata rules
    const landCol = app.findCollectionByNameOrId('land_metadata')
    landCol.listRule = "@request.auth.id != ''"
    landCol.viewRule = "@request.auth.id != ''"
    landCol.createRule = '@request.auth.role = "admin"'
    landCol.updateRule = '@request.auth.role = "admin"'
    landCol.deleteRule = '@request.auth.role = "admin"'
    app.save(landCol)

    // 3. Update document_checks rules
    const docChecksCol = app.findCollectionByNameOrId('document_checks')
    docChecksCol.listRule = "@request.auth.id != ''"
    docChecksCol.viewRule = "@request.auth.id != ''"
    docChecksCol.createRule = "@request.auth.id != ''"
    docChecksCol.updateRule = '@request.auth.role = "admin"'
    docChecksCol.deleteRule = '@request.auth.role = "admin"'
    app.save(docChecksCol)

    // 4. Update document_types rules
    const docTypesCol = app.findCollectionByNameOrId('document_types')
    docTypesCol.listRule = "@request.auth.id != ''"
    docTypesCol.viewRule = "@request.auth.id != ''"
    docTypesCol.createRule = '@request.auth.role = "admin"'
    docTypesCol.updateRule = '@request.auth.role = "admin"'
    docTypesCol.deleteRule = '@request.auth.role = "admin"'
    app.save(docTypesCol)

    // 5. Update external_offices rules
    const officesCol = app.findCollectionByNameOrId('external_offices')
    officesCol.listRule = '@request.auth.role = "admin"'
    officesCol.viewRule = '@request.auth.role = "admin"'
    officesCol.createRule = '@request.auth.role = "admin"'
    officesCol.updateRule = '@request.auth.role = "admin"'
    officesCol.deleteRule = '@request.auth.role = "admin"'
    app.save(officesCol)

    // 6. Update app_settings rules
    const settingsCol = app.findCollectionByNameOrId('app_settings')
    settingsCol.listRule = '@request.auth.role = "admin"'
    settingsCol.viewRule = '@request.auth.role = "admin"'
    settingsCol.createRule = '@request.auth.role = "admin"'
    settingsCol.updateRule = '@request.auth.role = "admin"'
    settingsCol.deleteRule = null
    app.save(settingsCol)

    // 7. Update comments rules - admin only
    const commentsCol = app.findCollectionByNameOrId('comments')
    commentsCol.listRule = '@request.auth.role = "admin"'
    commentsCol.viewRule = '@request.auth.role = "admin"'
    commentsCol.createRule = '@request.auth.role = "admin"'
    commentsCol.updateRule = '@request.auth.role = "admin"'
    commentsCol.deleteRule = '@request.auth.role = "admin"'
    app.save(commentsCol)

    // 8. history_logs: keep list/view/create for all authenticated
    const historyCol = app.findCollectionByNameOrId('history_logs')
    historyCol.listRule = "@request.auth.id != ''"
    historyCol.viewRule = "@request.auth.id != ''"
    historyCol.createRule = "@request.auth.id != ''"
    app.save(historyCol)

    // 9. Set all existing users to role = "admin"
    const allUsers = app.findRecordsByFilter('users', "id != ''", 'created', 1000, 0)
    for (var i = 0; i < allUsers.length; i++) {
      var u = allUsers[i]
      if (!u.getString('role')) {
        u.set('role', 'admin')
        app.save(u)
      }
    }
  },
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    usersCol.listRule = 'id = @request.auth.id'
    usersCol.viewRule = 'id = @request.auth.id'
    usersCol.createRule = null
    usersCol.updateRule = 'id = @request.auth.id'
    usersCol.deleteRule = 'id = @request.auth.id'
    usersCol.fields.removeByName('role')
    app.save(usersCol)

    var col = app.findCollectionByNameOrId('land_metadata')
    col.createRule = "@request.auth.id != ''"
    col.updateRule = ''
    col.deleteRule = ''
    app.save(col)

    col = app.findCollectionByNameOrId('document_checks')
    col.createRule = ''
    col.updateRule = ''
    col.deleteRule = ''
    app.save(col)

    col = app.findCollectionByNameOrId('document_types')
    col.createRule = "@request.auth.id != ''"
    col.updateRule = "@request.auth.id != ''"
    col.deleteRule = null
    app.save(col)

    col = app.findCollectionByNameOrId('external_offices')
    col.listRule = ''
    col.viewRule = ''
    col.createRule = ''
    col.updateRule = ''
    col.deleteRule = ''
    app.save(col)

    col = app.findCollectionByNameOrId('app_settings')
    col.listRule = "@request.auth.id != ''"
    col.viewRule = "@request.auth.id != ''"
    col.createRule = "@request.auth.id != ''"
    col.updateRule = "@request.auth.id != ''"
    app.save(col)

    col = app.findCollectionByNameOrId('comments')
    col.listRule = ''
    col.viewRule = ''
    col.createRule = ''
    col.updateRule = ''
    col.deleteRule = ''
    app.save(col)
  },
)
