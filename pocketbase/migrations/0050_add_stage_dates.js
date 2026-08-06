migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('land_metadata')

    // Data de entrada em cada etapa, no formato { "<id-da-etapa>": "ISO date" }.
    //
    // Passa a ser a fonte da contagem de dias (card do board e dashboard). Antes
    // isso era inferido: o card usava `updated` (bumpado por qualquer edição) e o
    // dashboard reconstruía a partir de history_logs. Nenhum dos dois era
    // editável, que é o que o time precisa para corrigir datas retroativas.
    if (!collection.fields.getByName('stage_dates')) {
      collection.fields.add(new JSONField({ name: 'stage_dates', maxSize: 0 }))
    }
    app.save(collection)

    // Zera as datas de entrada de todas as terras: o time vai preencher as reais
    // pela tela de cada card. Os history_logs são preservados como trilha de
    // auditoria — eles registram o que de fato aconteceu e não são recalculados.
    var records = app.findRecordsByFilter('land_metadata', "id != ''", '', 0, 0)
    for (var i = 0; i < records.length; i++) {
      records[i].set('stage_dates', {})
      app.save(records[i])
    }

    app.logger().info('0050_add_stage_dates: datas de etapa zeradas', 'terras', records.length)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('land_metadata')
      if (collection.fields.getByName('stage_dates')) {
        collection.fields.removeByName('stage_dates')
      }
      app.save(collection)
    } catch (_) {}
  },
)
