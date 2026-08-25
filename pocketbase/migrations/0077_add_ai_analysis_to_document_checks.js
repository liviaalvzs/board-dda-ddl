migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('document_checks')
    collection.fields.add(
      new Field({
        type: 'json',
        id: 'json_ai_analysis',
        name: 'ai_analysis',
        maxSize: 0,
        required: false,
        hidden: false,
        presentable: false,
        system: false,
      }),
    )
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('document_checks')
    collection.fields.removeById('json_ai_analysis')
    app.save(collection)
  },
)
