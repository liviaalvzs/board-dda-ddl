migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('document_checks')
    if (!col.fields.getByName('document_file')) {
      col.fields.add(
        new FileField({
          name: 'document_file',
          maxSelect: 1,
          maxSize: 10485760,
          mimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        }),
      )
    }
    app.save(col)

    try {
      app.findFirstRecordByData('app_settings', 'key', 'required_document_types')
    } catch (_) {
      const settingsCol = app.findCollectionByNameOrId('app_settings')
      const record = new Record(settingsCol)
      record.set('key', 'required_document_types')
      record.set('value', '["cpf","rg","certidao-nascimento"]')
      app.save(record)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('document_checks')
      col.fields.removeByName('document_file')
      app.save(col)
    } catch (_) {}
    try {
      const record = app.findFirstRecordByData('app_settings', 'key', 'required_document_types')
      app.delete(record)
    } catch (_) {}
  },
)
