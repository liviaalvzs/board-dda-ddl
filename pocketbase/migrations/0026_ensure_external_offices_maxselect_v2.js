migrate(
  (app) => {
    app
      .db()
      .newQuery(`
    UPDATE land_metadata 
    SET external_offices = COALESCE(json_extract(external_offices, '$[0]'), '')
    WHERE external_offices LIKE '[%'
  `)
      .execute()

    const col = app.findCollectionByNameOrId('land_metadata')
    const field = col.fields.getByName('external_offices')
    if (field && field.maxSelect !== 1) {
      field.maxSelect = 1
      app.save(col)
    }
  },
  (app) => {},
)
