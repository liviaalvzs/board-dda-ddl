routerAdd(
  'POST',
  '/backend/v1/backfill-stage-dates',
  (e) => {
    if (!e.auth || e.auth.getString('role') !== 'admin') {
      return e.forbiddenError('Apenas administradores podem rodar o preenchimento.')
    }

    // Etapa de origem na API externa e coluna de destino no nosso board.
    var SOURCE_STAGE = 'diligencia em confeccao'
    var TARGET_COLUMN = 'triagem-documentos-basicos'

    // Compara sem acento e sem caixa, porque o nome vem digitado do outro lado.
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

    // Campo JSON: o valor lido do registro não é um objeto JS comum, então a
    // leitura é defensiva e cai para {} em vez de estourar.
    function readStageDates(record) {
      var raw = record.get('stage_dates')
      if (!raw) return {}
      try {
        if (typeof raw === 'string') return JSON.parse(raw) || {}
        var text = String(raw)
        if (text && text.charAt(0) === '{') return JSON.parse(text) || {}
      } catch (_) {}
      return {}
    }

    var apiKey = $secrets.get('VITE_CORE_KEY') || ''
    if (!apiKey) {
      return e.internalServerError('VITE_CORE_KEY não configurada')
    }

    var records = $app.findRecordsByFilter('land_metadata', "external_id != ''", '', 0, 0)

    var report = {
      total: records.length,
      preenchidas: 0,
      etapaNaoEncontrada: 0,
      semResposta: 0,
      erros: 0,
      exemplosNaoEncontrados: [],
    }

    for (var i = 0; i < records.length; i++) {
      var record = records[i]
      var externalId = record.getString('external_id')
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
          report.erros++
          continue
        }

        var body = res.json || {}
        items = (body.data && body.data.items) || body.items || []
      } catch (err) {
        report.erros++
        continue
      }

      if (!items || items.length === 0) {
        report.semResposta++
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
        if (!entry || new Date(when).getTime() < new Date(entry).getTime()) {
          entry = when
        }
      }

      if (!entry) {
        report.etapaNaoEncontrada++
        if (report.exemplosNaoEncontrados.length < 5) {
          var nomes = []
          for (var k = 0; k < items.length && k < 6; k++) {
            nomes.push((items[k].status && items[k].status.name) || '?')
          }
          report.exemplosNaoEncontrados.push({ terra: externalId, etapasApi: nomes })
        }
        continue
      }

      var dates = readStageDates(record)
      dates[TARGET_COLUMN] = new Date(entry).toISOString()

      try {
        record.set('stage_dates', dates)
        $app.save(record)
        report.preenchidas++
      } catch (saveErr) {
        report.erros++
        $app
          .logger()
          .error(
            'backfill-stage-dates: falha ao salvar',
            'terra',
            externalId,
            'error',
            String(saveErr),
          )
      }
    }

    return e.json(200, report)
  },
  $apis.requireAuth(),
)
