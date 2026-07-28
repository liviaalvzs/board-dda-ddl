migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('land_metadata')
    if (!col.fields.getByName('cluster_serial')) {
      col.fields.add(new TextField({ name: 'cluster_serial', required: false }))
    }
    col.addIndex('idx_land_metadata_cluster_serial', false, 'cluster_serial', '')
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('land_metadata')
    try {
      col.fields.removeByName('cluster_serial')
    } catch (_) {}
    try {
      col.removeIndex('idx_land_metadata_cluster_serial')
    } catch (_) {}
    app.save(col)
  },
)
