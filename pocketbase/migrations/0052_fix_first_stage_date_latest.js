migrate(
  (app) => {
    // Corrige a 0051, que gravou a ocorrência MAIS ANTIGA de "Diligência em
    // confecção". Terras que passaram por essa etapa mais de uma vez ficaram com
    // a data da primeira passagem (a CAM-0193, por exemplo, pegou 2025-07-07 em
    // vez de 2026-06-01).
    //
    // O que vale é a entrada mais RECENTE — a passagem em andamento, que é a
    // exibida como "EM ANDAMENTO" na linha do tempo de diligência externa.
    var SOURCE_STAGE = 'diligencia em confeccao'
    var TARGET_COLUMN = 'triagem-documentos-basicos'

    function normalize(value) {
      return String(value || '')
        .toLowerCase()
        .replace(/[àáâãä]/g, 'a')
        .replace(/[èéêë]/g, 'e')
        .replace(/[ìíîï]/g, 'i')
        .replace(/[òóôõö]/g, 'o')
        .replace(/[ùúûü]/g, 'u')
        .replace(/ç/g, 'c')
        .replace(/\s+/g, ' ')
        .trim()
    }

    function readStageDates(record) {
      var raw = null
      try {
        raw = record.get('stage_dates')
      } catch (_) {
        return {}
      }
      if (raw === null || raw === undefined) return {}
      try {
        var text = typeof raw === 'string' ? raw : String(raw)
        if (text && text.charAt(0) === '{') {
          var parsed = JSON.parse(text)
          if (parsed && typeof parsed === 'object') return parsed
        }
      } catch (_) {}
      return {}
    }

    var apiKey = ''
    try {
      apiKey = $secrets.get('VITE_CORE_KEY') || ''
    } catch (_) {}
    if (!apiKey) {
      app.logger().warn('0052_fix_first_stage_date_latest: VITE_CORE_KEY ausente')
      return
    }

    var records = []
    try {
      records = app.findRecordsByFilter('land_metadata', "external_id != ''", '', 0, 0)
    } catch (_) {
      return
    }

    var fixed = 0
    var unchanged = 0
    var notFound = 0
    var failed = 0

    for (var i = 0; i < records.length; i++) {
      var record = records[i]
      var externalId = ''
      try {
        externalId = record.getString('external_id')
      } catch (_) {
        continue
      }
      if (!externalId) continue

      var items = []
      try {
        var res = $http.send({
          url:
            'https://prdfovmhyc.execute-api.us-east-1.amazonaws.com/api/v1/partner/land-status?landIds=' +
            encodeURIComponent(externalId),
          method: 'GET',
          headers: { 'X-API-Key': apiKey, Accept: 'application/json' },
          timeout: 20,
        })
        if (res.statusCode >= 400) {
          failed++
          continue
        }
        var body = res.json || {}
        items = (body.data && body.data.items) || body.items || []
      } catch (_) {
        failed++
        continue
      }

      // Entrada MAIS RECENTE na etapa.
      var entry = null
      for (var j = 0; j < items.length; j++) {
        var item = items[j]
        var name = item && item.status ? item.status.name : ''
        if (normalize(name) !== SOURCE_STAGE) continue
        var when = item.startDate || item.creationDate
        if (!when) continue
        if (!entry || new Date(when).getTime() > new Date(entry).getTime()) entry = when
      }

      if (!entry) {
        notFound++
        continue
      }

      try {
        var dates = readStageDates(record)
        var next = new Date(entry).toISOString()
        if (dates[TARGET_COLUMN] === next) {
          unchanged++
          continue
        }
        dates[TARGET_COLUMN] = next
        record.set('stage_dates', dates)
        app.save(record)
        fixed++
      } catch (_) {
        failed++
      }
    }

    app
      .logger()
      .info(
        '0052_fix_first_stage_date_latest: concluído',
        'total',
        records.length,
        'corrigidas',
        fixed,
        'ja_corretas',
        unchanged,
        'etapa_nao_encontrada',
        notFound,
        'falhas',
        failed,
      )
  },
  (app) => {
    // Sem volta: a data anterior estava errada e não vale a pena restaurá-la.
  },
)
