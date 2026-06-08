migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('land_metadata')
    col.addIndex('idx_land_metadata_status', false, 'status', '')
    col.addIndex('idx_land_metadata_responsible', false, 'responsible_user', '')
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('land_metadata')
    col.removeIndex('idx_land_metadata_status')
    col.removeIndex('idx_land_metadata_responsible')
    app.save(col)
  },
)
