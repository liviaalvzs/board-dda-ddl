migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('land_metadata')

    if (!col.fields.getByName('data_solicitacao_dd')) {
      col.fields.add(new DateField({ name: 'data_solicitacao_dd', required: false }))
    }

    col.addIndex('idx_land_metadata_data_solicitacao_dd', false, 'data_solicitacao_dd', '')

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('land_metadata')

    try {
      col.fields.removeByName('data_solicitacao_dd')
    } catch (_) {}

    try {
      col.removeIndex('idx_land_metadata_data_solicitacao_dd')
    } catch (_) {}

    app.save(col)
  },
)
