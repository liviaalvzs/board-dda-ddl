migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('document_checks')

    // Extensão do arquivo atual (".pdf", ".png"...).
    //
    // A chave do arquivo atual no S3 não tem extensão, para que qualquer
    // substituição sobrescreva sempre a mesma chave — é isso que evita deixar
    // objetos órfãos quando o tipo muda, já que não temos permissão de exclusão.
    // Como a extensão some da chave, ela precisa ser guardada aqui: é o que
    // nomeia a cópia arquivada (" OLD.png") e o nome sugerido no download.
    if (!collection.fields.getByName('file_ext')) {
      collection.fields.add(new TextField({ name: 'file_ext', required: false }))
    }
    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('document_checks')
      if (collection.fields.getByName('file_ext')) {
        collection.fields.removeByName('file_ext')
      }
      app.save(collection)
    } catch (_) {}
  },
)
