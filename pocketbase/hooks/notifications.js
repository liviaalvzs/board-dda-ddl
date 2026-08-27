onRecordUpdate((e) => {
  var STAGE_LABELS = {
    'triagem-documentos-basicos': '1. Triagem documentos básicos',
    'aguardando-documentos-basicos': '2. Aguardando documentos básicos',
    'emissao-certidoes': '3. Emissão de certidões',
    'auditoria-escritorio-externo': '4. Em auditoria / Escritório externo',
    'recebimento-ddl-preliminar': '5. Recebimento DDL preliminar',
    'on-hold': 'On Hold',
    'levantamento-documentos-complementares': '6. Levantamento de documentos complementares',
    'recebimento-ddl-conclusiva': '7. Recebimento DDL conclusiva',
    'elaboracao-contrato': '8. Em elaboração de contrato',
    'assinado-acompanhamento-cp': '9. Assinado / Acompanhamento das CP',
  }

  var oldStage = ''
  try {
    oldStage = e.record.original().getString('kanban_stage')
  } catch (_) {
    // original() may not be available
  }
  var newStage = e.record.getString('kanban_stage')

  e.next()

  if (!oldStage || !newStage || oldStage === newStage) return

  var landName = e.record.getString('name') || e.record.getString('cluster_serial') || ''
  var landId = e.record.getString('external_id') || ''

  var actorName = ''
  try {
    var auth = e.auth
    if (auth) actorName = auth.getString('name') || auth.email() || ''
  } catch (_) {
    // auth may not be available
  }

  var oldLabel = STAGE_LABELS[oldStage] || oldStage || 'Desconhecida'
  var newLabel = STAGE_LABELS[newStage] || newStage || 'Desconhecida'

  try {
    var col = $app.findCollectionByNameOrId('notifications')
    var record = new Record(col)
    record.set('type', 'stage_change')
    record.set('title', landName || 'Terra')
    record.set('message', 'Passou de "' + oldLabel + '" para "' + newLabel + '"')
    record.set('land_id', landId)
    record.set('land_name', landName)
    record.set('actor_name', actorName)
    $app.save(record)
  } catch (err) {
    $app.logger().warn('notifications: falha ao criar', 'error', String(err))
  }
}, 'land_metadata')
