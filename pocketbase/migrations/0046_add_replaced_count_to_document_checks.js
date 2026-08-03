migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('document_checks')

    // Quantas vezes o documento já foi substituído. Define o sufixo da cópia
    // arquivada no S3: 0 -> " OLD", 1 -> " OLD 1", 2 -> " OLD 2"...
    //
    // O contador fica no banco de propósito: descobrir o próximo sufixo sondando
    // o S3 com HEAD não é confiável, porque a AWS responde 403 (em vez de 404)
    // quando falta permissão, e não daria para distinguir "já existe" de
    // "sem acesso".
    if (!collection.fields.getByName('replaced_count')) {
      collection.fields.add(new NumberField({ name: 'replaced_count', onlyInt: true }))
    }
    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('document_checks')
      if (collection.fields.getByName('replaced_count')) {
        collection.fields.removeByName('replaced_count')
      }
      app.save(collection)
    } catch (_) {}
  },
)
