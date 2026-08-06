migrate(
  (app) => {
    // Remove registros de land_metadata malformados: o cluster serial foi
    // gravado no campo external_id, que deveria conter o id (UUID) da API.
    //
    // Esses registros não têm etapa, documento, comentário nem histórico — não
    // representam nenhuma terra do board, e ainda entram na contagem do
    // dashboard como se fossem.
    //
    // O filtro exige status vazio de propósito: existe uma terra REAL com
    // cluster serial EUN-0154 cujo external_id é o UUID correto, e ela não pode
    // ser tocada.
    var SERIAL_LIKE = ['EUN-0154', 'PGM-0196']

    var removed = []

    for (var i = 0; i < SERIAL_LIKE.length; i++) {
      var serial = SERIAL_LIKE[i]
      var records = []
      try {
        records = app.findRecordsByFilter(
          'land_metadata',
          'external_id = {:serial} && status = ""',
          '',
          0,
          0,
          { serial: serial },
        )
      } catch (err) {
        app
          .logger()
          .warn('0053: falha ao buscar registro malformado', 'serial', serial, 'erro', String(err))
        continue
      }

      for (var j = 0; j < records.length; j++) {
        try {
          removed.push(serial + ' (' + records[j].id + ')')
          app.delete(records[j])
        } catch (delErr) {
          app.logger().warn('0053: falha ao remover', 'serial', serial, 'erro', String(delErr))
        }
      }
    }

    app
      .logger()
      .info(
        '0053_remove_malformed_land_metadata',
        'removidos',
        removed.length,
        'quais',
        removed.join(', '),
      )
  },
  (app) => {
    // Sem volta: os registros não tinham conteúdo, então não há o que restaurar.
  },
)
