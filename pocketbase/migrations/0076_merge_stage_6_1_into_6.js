migrate(
  (app) => {
    var SOURCE = 'auditoria-escritorio-externo-conclusiva'
    var TARGET = 'levantamento-documentos-complementares'
    var moved = 0

    var records = app.findRecordsByFilter('land_metadata', 'status = {:stage}', '', 0, 0, {
      stage: SOURCE,
    })
    for (var i = 0; i < records.length; i++) {
      records[i].set('status', TARGET)
      app.save(records[i])
      moved++
    }

    app.logger().info('0076_merge_stage_6_1_into_6: moved ' + moved + ' lands to ' + TARGET)
  },
  (app) => {
    // Non-reversible
  },
)
