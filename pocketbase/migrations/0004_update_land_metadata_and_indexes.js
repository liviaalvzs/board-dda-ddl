migrate(
  (app) => {
    const metaCol = app.findCollectionByNameOrId('land_metadata')

    if (!metaCol.fields.getByName('responsible_user')) {
      metaCol.fields.add(
        new RelationField({
          name: 'responsible_user',
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        }),
      )
    }

    metaCol.addIndex('idx_land_metadata_external_id', false, 'external_id', '')
    app.save(metaCol)

    const commentsCol = app.findCollectionByNameOrId('comments')
    commentsCol.addIndex('idx_comments_land_id', false, 'land_id', '')
    app.save(commentsCol)
  },
  (app) => {
    const metaCol = app.findCollectionByNameOrId('land_metadata')
    metaCol.removeIndex('idx_land_metadata_external_id')
    const field = metaCol.fields.getByName('responsible_user')
    if (field) {
      metaCol.fields.removeById(field.id)
    }
    app.save(metaCol)

    const commentsCol = app.findCollectionByNameOrId('comments')
    commentsCol.removeIndex('idx_comments_land_id')
    app.save(commentsCol)
  },
)
