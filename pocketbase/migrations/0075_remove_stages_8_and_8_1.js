migrate(
  (app) => {
    var REMOVED_STAGES = ['preparar-comite', 'alinhamento-juridico-terras']
    var TARGET = 'recebimento-ddl-conclusiva'
    var moved = 0

    for (var s = 0; s < REMOVED_STAGES.length; s++) {
      var records = app.findRecordsByFilter('land_metadata', 'status = {:stage}', '', 0, 0, {
        stage: REMOVED_STAGES[s],
      })
      for (var i = 0; i < records.length; i++) {
        records[i].set('status', TARGET)
        app.save(records[i])
        moved++
      }
    }

    app.logger().info('0075_remove_stages_8_and_8_1: moved ' + moved + ' lands to ' + TARGET)
  },
  (app) => {
    // Non-reversible: we don't know which lands were in 8 vs 8.1
  },
)
