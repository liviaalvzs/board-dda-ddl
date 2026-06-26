migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('land_metadata')
    col.createRule = null
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('land_metadata')
    col.createRule = ''
    app.save(col)
  },
)
