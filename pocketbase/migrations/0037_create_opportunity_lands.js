migrate(
  (app) => {
    const opportunitiesCol = app.findCollectionByNameOrId('opportunities')

    const collection = new Collection({
      name: 'opportunity_lands',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: '@request.auth.role = "admin"',
      updateRule: '@request.auth.role = "admin"',
      deleteRule: '@request.auth.role = "admin"',
      fields: [
        {
          name: 'opportunity_id',
          type: 'relation',
          required: true,
          collectionId: opportunitiesCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'external_land_id', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_opportunity_lands_opportunity_id ON opportunity_lands (opportunity_id)',
        'CREATE INDEX idx_opportunity_lands_external_land_id ON opportunity_lands (external_land_id)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('opportunity_lands')
      app.delete(col)
    } catch (_) {}
  },
)
