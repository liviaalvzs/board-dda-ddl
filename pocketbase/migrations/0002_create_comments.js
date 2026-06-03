migrate(
  (app) => {
    const collection = new Collection({
      name: 'comments',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != '' && @request.auth.id = @request.body.user",
      updateRule: "@request.auth.id != '' && @request.auth.id = user",
      deleteRule: "@request.auth.id != '' && @request.auth.id = user",
      fields: [
        { name: 'land_id', type: 'text', required: true },
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'content', type: 'text', required: true },
        { name: 'attachments', type: 'file', maxSelect: 10, maxSize: 52428800 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('comments')
    app.delete(collection)
  },
)
