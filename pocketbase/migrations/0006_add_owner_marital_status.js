migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('land_metadata')
    col.fields.add(
      new SelectField({
        name: 'owner_marital_status',
        values: ['solteiro', 'casado', 'divorciado', 'viuvo'],
        maxSelect: 1,
      }),
    )
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('land_metadata')
    col.fields.removeByName('owner_marital_status')
    app.save(col)
  },
)
