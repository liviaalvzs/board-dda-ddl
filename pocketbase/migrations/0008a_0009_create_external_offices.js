migrate(
  (app) => {
    const offices = new Collection({
      name: 'external_offices',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(offices)

    const landMetadata = app.findCollectionByNameOrId('land_metadata')
    landMetadata.fields.add(
      new RelationField({
        name: 'external_offices',
        collectionId: offices.id,
        maxSelect: 100,
        cascadeDelete: false,
      }),
    )
    app.save(landMetadata)
  },
  (app) => {
    const landMetadata = app.findCollectionByNameOrId('land_metadata')
    landMetadata.fields.removeByName('external_offices')
    app.save(landMetadata)

    const offices = app.findCollectionByNameOrId('external_offices')
    app.delete(offices)
  },
)
