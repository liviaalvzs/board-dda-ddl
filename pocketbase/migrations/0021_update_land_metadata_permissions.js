migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('land_metadata')
    col.createRule = "@request.auth.id != ''"
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('land_metadata')
    col.createRule = null
    app.save(col)
  },
)
