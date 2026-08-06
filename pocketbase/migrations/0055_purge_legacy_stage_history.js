migrate(
  (app) => {
    // Remove do histórico as mudanças de etapa que referenciam colunas do fluxo
    // ANTIGO (as sem numeração), aposentadas na reestruturação do board.
    //
    // Cuidado com 'emissao-certidoes': esse id existe nos dois fluxos — era uma
    // coluna antiga e continua sendo a coluna 3. Por isso a regra olha os DOIS
    // lados da transição e só apaga quando um deles é exclusivamente antigo.
    // Assim "aguardando-doc -> emissao-certidoes" sai, mas
    // "auditoria-escritorio-externo -> emissao-certidoes" permanece.
    //
    // Isso não afeta contagem de dias nem dashboard: aquilo vem de
    // land_metadata.stage_dates, não do histórico.
    var LEGACY_ONLY = {
      'assinatura-carta': true,
      'aguardando-doc': true,
      'analise-interna-preliminar': true,
      'dd-conclusiva': true,
      'analise-interna-conclusiva': true,
      prospeccao: true,
      'analise-tecnica': true,
      'proposta-assinada': true,
      'dda-analise': true,
      aprovado: true,
      reprovado: true,
    }

    function readDetails(record) {
      var raw = null
      try {
        raw = record.get('change_details')
      } catch (_) {
        return null
      }
      if (!raw) return null
      if (typeof raw === 'object' && raw.field !== undefined) return raw
      try {
        var text = typeof raw === 'string' ? raw : String(raw)
        if (text && text.charAt(0) === '{') return JSON.parse(text)
      } catch (_) {}
      return null
    }

    var records = []
    try {
      records = app.findRecordsByFilter('history_logs', "id != ''", '', 0, 0)
    } catch (err) {
      app.logger().warn('0055: falha ao listar history_logs', 'erro', String(err))
      return
    }

    var removed = 0
    var kept = 0
    var unreadable = 0

    for (var i = 0; i < records.length; i++) {
      var details = readDetails(records[i])
      if (!details) {
        unreadable++
        continue
      }
      if (details.field !== 'status') {
        kept++
        continue
      }

      var isLegacy = LEGACY_ONLY[details.old] === true || LEGACY_ONLY[details.new] === true
      if (!isLegacy) {
        kept++
        continue
      }

      try {
        app.delete(records[i])
        removed++
      } catch (delErr) {
        app.logger().warn('0055: falha ao remover log', 'id', records[i].id, 'erro', String(delErr))
      }
    }

    app
      .logger()
      .info(
        '0055_purge_legacy_stage_history: concluído',
        'total',
        records.length,
        'removidos',
        removed,
        'mantidos',
        kept,
        'ilegiveis',
        unreadable,
      )
  },
  (app) => {
    // Sem volta: os registros apagados referenciavam etapas que não existem mais.
  },
)
