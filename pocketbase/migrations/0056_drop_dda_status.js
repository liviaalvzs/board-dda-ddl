migrate(
  (app) => {
    // Remove o campo dda_status de land_metadata.
    //
    // Ele vinha do seletor "DDA Distribuída ao Escritório Externo", que deixou
    // de existir na tela da terra. Sem interface de edição, o valor virava um
    // selo permanente no card (a CAM-0193 exibia "DDA Distribuída") que ninguém
    // conseguia mais alterar.
    //
    // O acompanhamento de DDA hoje é feito pelo bloco Diligência Ambiental:
    // data estimada, data de recebimento e prestador. Esses campos NÃO são
    // afetados por esta migration.
    const collection = app.findCollectionByNameOrId('land_metadata')

    if (collection.fields.getByName('dda_status')) {
      collection.fields.removeByName('dda_status')
      app.save(collection)
      app.logger().info('0056_drop_dda_status: campo removido de land_metadata')
    }
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('land_metadata')
      if (!collection.fields.getByName('dda_status')) {
        collection.fields.add(
          new SelectField({
            name: 'dda_status',
            values: ['existing', 'distributed', 'none'],
            maxSelect: 1,
          }),
        )
        app.save(collection)
      }
    } catch (_) {}
  },
)
