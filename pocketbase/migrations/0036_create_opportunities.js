migrate(
  (app) => {
    const collection = new Collection({
      name: 'opportunities',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: '@request.auth.role = "admin"',
      updateRule: '@request.auth.role = "admin"',
      deleteRule: '@request.auth.role = "admin"',
      fields: [
        { name: 'external_id', type: 'text', required: true },
        { name: 'company_id', type: 'text', required: false },
        { name: 'primary_owner', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_opportunities_external_id ON opportunities (external_id)',
        'CREATE INDEX idx_opportunities_company_id ON opportunities (company_id)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('opportunities')
      app.delete(col)
    } catch (_) {}
  },
)
