migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('land_subjects')
    collection.createRule = "@request.auth.id != ''"
    collection.updateRule = "@request.auth.id != ''"
    collection.deleteRule = "@request.auth.id != ''"
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('land_subjects')
    collection.createRule = '@request.auth.role = "admin"'
    collection.updateRule = '@request.auth.role = "admin"'
    collection.deleteRule = '@request.auth.role = "admin"'
    app.save(collection)
  },
)
