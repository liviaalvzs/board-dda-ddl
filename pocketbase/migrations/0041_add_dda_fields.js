migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('land_metadata')
    const officesId = app.findCollectionByNameOrId('external_offices').id

    if (!col.fields.getByName('data_pedido_dda')) {
      col.fields.add(new DateField({ name: 'data_pedido_dda', required: false }))
    }
    if (!col.fields.getByName('data_recebimento_dda')) {
      col.fields.add(new DateField({ name: 'data_recebimento_dda', required: false }))
    }
    if (!col.fields.getByName('prestador_dda')) {
      col.fields.add(
        new RelationField({
          name: 'prestador_dda',
          collectionId: officesId,
          maxSelect: 1,
          cascadeDelete: false,
        }),
      )
    }

    col.addIndex('idx_land_metadata_data_pedido_dda', false, 'data_pedido_dda', '')
    col.addIndex('idx_land_metadata_data_recebimento_dda', false, 'data_recebimento_dda', '')

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('land_metadata')
    try {
      col.fields.removeByName('data_pedido_dda')
    } catch (_) {}
    try {
      col.fields.removeByName('data_recebimento_dda')
    } catch (_) {}
    try {
      col.fields.removeByName('prestador_dda')
    } catch (_) {}
    try {
      col.removeIndex('idx_land_metadata_data_pedido_dda')
    } catch (_) {}
    try {
      col.removeIndex('idx_land_metadata_data_recebimento_dda')
    } catch (_) {}
    app.save(col)
  },
)
