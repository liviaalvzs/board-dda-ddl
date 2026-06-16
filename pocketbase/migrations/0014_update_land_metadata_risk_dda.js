migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('land_metadata')

    if (!col.fields.getByName('risk_level')) {
      col.fields.add(
        new SelectField({
          name: 'risk_level',
          values: ['low', 'medium', 'high'],
          maxSelect: 1,
        }),
      )
    }

    if (!col.fields.getByName('dda_status')) {
      col.fields.add(
        new SelectField({
          name: 'dda_status',
          values: ['existing', 'distributed', 'none'],
          maxSelect: 1,
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('land_metadata')

    const risk = col.fields.getByName('risk_level')
    if (risk) col.fields.removeById(risk.id)

    const dda = col.fields.getByName('dda_status')
    if (dda) col.fields.removeById(dda.id)

    app.save(col)
  },
)
