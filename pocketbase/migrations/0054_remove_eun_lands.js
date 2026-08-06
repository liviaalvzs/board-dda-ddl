migrate(
  (app) => {
    // Remove as terras EUN-0321 e EUN-0154 a pedido explícito, junto de tudo que
    // depende delas. Elas haviam saído do grupo "Due Diligence" na origem por
    // terem avançado para "Comitê de Terras (Em aprovação)".
    //
    // Isso apaga também 3 registros de documento da EUN-0321 e o histórico das
    // duas. A decisão foi confirmada depois de essa consequência ser apontada.
    //
    // ATENÇÃO: os arquivos correspondentes no S3 NÃO são removidos — a
    // aplicação não tem permissão de exclusão no bucket. Eles continuam em
    // transient/skip-applications/due_dilligence_control/documents/ e precisam
    // de limpeza manual, se desejada.
    var EXTERNAL_IDS = [
      'a1c54535-3094-4fb6-80ec-ba6f72d3aa3a', // EUN-0321
      '11e3a406-36cd-4662-8318-cd745418ddef', // EUN-0154
    ]

    var DEPENDENTS = ['document_checks', 'comments', 'history_logs']

    var report = []

    for (var i = 0; i < EXTERNAL_IDS.length; i++) {
      var externalId = EXTERNAL_IDS[i]
      var counts = { terra: externalId }

      for (var d = 0; d < DEPENDENTS.length; d++) {
        var collection = DEPENDENTS[d]
        var removed = 0
        try {
          var rows = app.findRecordsByFilter(collection, 'land_id = {:landId}', '', 0, 0, {
            landId: externalId,
          })
          for (var r = 0; r < rows.length; r++) {
            app.delete(rows[r])
            removed++
          }
        } catch (err) {
          app
            .logger()
            .warn('0054: falha ao limpar dependentes', 'colecao', collection, 'erro', String(err))
        }
        counts[collection] = removed
      }

      try {
        var lands = app.findRecordsByFilter(
          'land_metadata',
          'external_id = {:externalId}',
          '',
          0,
          0,
          { externalId: externalId },
        )
        var landsRemoved = 0
        for (var l = 0; l < lands.length; l++) {
          app.delete(lands[l])
          landsRemoved++
        }
        counts.land_metadata = landsRemoved
      } catch (err2) {
        app.logger().warn('0054: falha ao remover terra', 'terra', externalId, 'erro', String(err2))
        counts.land_metadata = 0
      }

      report.push(JSON.stringify(counts))
    }

    app.logger().info('0054_remove_eun_lands: concluído', 'detalhes', report.join(' | '))
  },
  (app) => {
    // Sem volta: os registros e seus dependentes foram apagados.
  },
)
