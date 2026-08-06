migrate(
  (app) => {
    // Preenche a data de entrada na primeira coluna do board a partir da etapa
    // "Diligência em confecção" da API externa — a mesma data que aparece na
    // linha do tempo de diligência externa da terra.
    //
    // Tudo é blindado: uma falha da API externa não pode reprovar o deploy.
    // O que não der certo fica registrado no log e pode ser refeito depois.
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

    // Campo JSON: o valor lido não é garantidamente um objeto JS comum. A
    // leitura tenta as formas conhecidas e só aceita o resultado se as chaves
    // parecerem ids de etapa — assim um decode errado não vira lixo gravado.
    function readStageDates(record) {
      var raw = null
      try {
        raw = record.get('stage_dates')
      } catch (_) {
        return {}
      }
      if (raw === null || raw === undefined) return {}

      var candidates = []
      try {
        if (typeof raw === 'string') candidates.push(raw)
        else candidates.push(String(raw))
      } catch (_) {}

      for (var i = 0; i < candidates.length; i++) {
        var text = candidates[i]
        if (!text || text.charAt(0) !== '{') continue
        try {
          var parsed = JSON.parse(text)
          if (parsed && typeof parsed === 'object') return parsed
        } catch (_) {}
      }

      if (typeof raw === 'object') {
        try {
          var keys = Object.keys(raw)
          var looksValid = keys.length > 0
          for (var k = 0; k < keys.length; k++) {
            if (/^\d+$/.test(keys[k])) {
              looksValid = false
              break
            }
          }
          if (looksValid) {
            var copy = {}
            for (var j = 0; j < keys.length; j++) copy[keys[j]] = String(raw[keys[j]])
            return copy
          }
        } catch (_) {}
      }

      return {}
    }

    var apiKey = ''
    try {
      apiKey = $secrets.get('VITE_CORE_KEY') || ''
    } catch (_) {}

    if (!apiKey) {
      app.logger().warn('0051_backfill_first_stage_date: VITE_CORE_KEY ausente, nada foi feito')
      return
    }

    var records = []
    try {
      records = app.findRecordsByFilter('land_metadata', "external_id != ''", '', 0, 0)
    } catch (_) {
      return
    }

    var filled = 0
    var notFound = 0
    var empty = 0
    var failed = 0
    var sampleNames = []

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

      if (!items || items.length === 0) {
        empty++
        continue
      }

      // Se a etapa aparecer mais de uma vez, vale a entrada mais antiga.
      var entry = null
      for (var j = 0; j < items.length; j++) {
        var item = items[j]
        var name = item && item.status ? item.status.name : ''
        if (normalize(name) !== SOURCE_STAGE) continue
        var when = item.startDate || item.creationDate
        if (!when) continue
        if (!entry || new Date(when).getTime() < new Date(entry).getTime()) entry = when
      }

      if (!entry) {
        notFound++
        if (sampleNames.length < 8) {
          for (var k = 0; k < items.length && sampleNames.length < 8; k++) {
            var n = (items[k].status && items[k].status.name) || '?'
            if (sampleNames.indexOf(n) === -1) sampleNames.push(n)
          }
        }
        continue
      }

      try {
        var dates = readStageDates(record)
        dates[TARGET_COLUMN] = new Date(entry).toISOString()
        record.set('stage_dates', dates)
        app.save(record)
        filled++
      } catch (saveErr) {
        failed++
      }
    }

    app
      .logger()
      .info(
        '0051_backfill_first_stage_date: concluído',
        'total',
        records.length,
        'preenchidas',
        filled,
        'etapa_nao_encontrada',
        notFound,
        'sem_itens',
        empty,
        'falhas',
        failed,
        'nomes_vistos_na_api',
        sampleNames.join(' | '),
      )
  },
  (app) => {
    // Remove apenas a data da primeira coluna, preservando as demais.
    try {
      var records = app.findRecordsByFilter('land_metadata', "external_id != ''", '', 0, 0)
      for (var i = 0; i < records.length; i++) {
        var raw = records[i].get('stage_dates')
        var dates = {}
        try {
          var text = typeof raw === 'string' ? raw : String(raw)
          if (text && text.charAt(0) === '{') dates = JSON.parse(text) || {}
        } catch (_) {}
        if (dates['triagem-documentos-basicos']) {
          delete dates['triagem-documentos-basicos']
          records[i].set('stage_dates', dates)
          app.save(records[i])
        }
      }
    } catch (_) {}
  },
)
