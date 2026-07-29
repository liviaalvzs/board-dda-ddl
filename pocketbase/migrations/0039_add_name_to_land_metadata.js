migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('land_metadata')
    if (!col.fields.getByName('name')) {
      col.fields.add(new TextField({ name: 'name', required: false }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('land_metadata')
    try {
      col.fields.removeByName('name')
    } catch (_) {}
    app.save(col)
  },
)
