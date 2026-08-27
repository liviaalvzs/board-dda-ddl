migrate(
  (app) => {
    const collection = new Collection({
      name: 'notifications',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null,
      updateRule: null,
      deleteRule: '@request.auth.role = "admin"',
      fields: [
        {
          name: 'type',
          type: 'select',
          maxSelect: 1,
          values: ['document', 'stage_change'],
          required: true,
        },
        { name: 'title', type: 'text', required: true },
        { name: 'message', type: 'text' },
        { name: 'land_id', type: 'text' },
        { name: 'land_name', type: 'text' },
        { name: 'actor_name', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_notifications_type ON notifications (type)',
        'CREATE INDEX idx_notifications_created ON notifications (created DESC)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('notifications')
      app.delete(collection)
    } catch (_) {}
  },
)
