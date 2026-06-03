migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('document_checks')
    col.fields.add(new TextField({ name: 'document_url', required: false }))
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('document_checks')
    col.fields.removeByName('document_url')
    app.save(col)
  },
)
