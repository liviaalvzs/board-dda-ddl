migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('land_metadata')
    const dateFields = [
      'data_assinatura_carta_proposta',
      'data_pedido_inicio_ddl',
      'data_recebimento_preliminar_ddm',
      'data_estimada_recebimento_ddl_conclusiva',
      'data_recebimento_dd_conclusiva',
    ]
    for (const name of dateFields) {
      if (!col.fields.getByName(name)) {
        col.fields.add(new DateField({ name, required: false }))
      }
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('land_metadata')
    const dateFields = [
      'data_assinatura_carta_proposta',
      'data_pedido_inicio_ddl',
      'data_recebimento_preliminar_ddm',
      'data_estimada_recebimento_ddl_conclusiva',
      'data_recebimento_dd_conclusiva',
    ]
    for (const name of dateFields) {
      try {
        col.fields.removeByName(name)
      } catch (_) {}
    }
    app.save(col)
  },
)
