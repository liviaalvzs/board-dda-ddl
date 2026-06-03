migrate(
  (app) => {
    const collection = new Collection({
      name: 'document_checks',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'land_id', type: 'text', required: true },
        { name: 'document_key', type: 'text', required: true },
        { name: 'is_completed', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_document_checks_land_id ON document_checks (land_id)',
        'CREATE UNIQUE INDEX idx_document_checks_unique ON document_checks (land_id, document_key)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('document_checks')
    app.delete(collection)
  },
)
