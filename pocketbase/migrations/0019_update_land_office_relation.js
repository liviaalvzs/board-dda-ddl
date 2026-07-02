migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('land_metadata')
    const field = col.fields.getByName('external_offices')
    if (field) {
      field.maxSelect = 1
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('land_metadata')
    const field = col.fields.getByName('external_offices')
    if (field) {
      field.maxSelect = 0
      app.save(col)
    }
  },
)
