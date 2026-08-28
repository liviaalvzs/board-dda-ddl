routerAdd(
  'GET',
  '/backend/v1/reprocess-sharepoint',
  (e) => {
    // ── SHA256 / HMAC / SigV4 ───────────────────────────────────────────
    function sha256(msg) {
      var K = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4,
        0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe,
        0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f,
        0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
        0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc,
        0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
        0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116,
        0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
        0xc67178f2,
      ]
      var H = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab,
        0x5be0cd19,
      ]
      var m = msg.slice()
      m.push(0x80)
      while (m.length % 64 !== 56) m.push(0)
      var bl = msg.length * 8
      m.push(0, 0, 0, 0)
      m.push((bl >>> 24) & 0xff, (bl >>> 16) & 0xff, (bl >>> 8) & 0xff, bl & 0xff)
      for (var off = 0; off < m.length; off += 64) {
        var W = []
        for (var i = 0; i < 16; i++)
          W[i] =
            (m[off + i * 4] << 24) |
            (m[off + i * 4 + 1] << 16) |
            (m[off + i * 4 + 2] << 8) |
            m[off + i * 4 + 3]
        for (var i = 16; i < 64; i++) {
          var s0 =
            ((W[i - 15] >>> 7) | (W[i - 15] << 25)) ^
            ((W[i - 15] >>> 18) | (W[i - 15] << 14)) ^
            (W[i - 15] >>> 3)
          var s1 =
            ((W[i - 2] >>> 17) | (W[i - 2] << 15)) ^
            ((W[i - 2] >>> 19) | (W[i - 2] << 13)) ^
            (W[i - 2] >>> 10)
          W[i] = (W[i - 16] + s0 + W[i - 7] + s1) | 0
        }
        var a = H[0],
          b2 = H[1],
          c = H[2],
          d = H[3],
          ee = H[4],
          f = H[5],
          g = H[6],
          h = H[7]
        for (var i = 0; i < 64; i++) {
          var S1 =
            ((ee >>> 6) | (ee << 26)) ^ ((ee >>> 11) | (ee << 21)) ^ ((ee >>> 25) | (ee << 7))
          var ch = (ee & f) ^ (~ee & g)
          var t1 = (h + S1 + ch + K[i] + W[i]) | 0
          var S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10))
          var mj = (a & b2) ^ (a & c) ^ (b2 & c)
          var t2 = (S0 + mj) | 0
          h = g
          g = f
          f = ee
          ee = (d + t1) | 0
          d = c
          c = b2
          b2 = a
          a = (t1 + t2) | 0
        }
        H[0] = (H[0] + a) | 0
        H[1] = (H[1] + b2) | 0
        H[2] = (H[2] + c) | 0
        H[3] = (H[3] + d) | 0
        H[4] = (H[4] + ee) | 0
        H[5] = (H[5] + f) | 0
        H[6] = (H[6] + g) | 0
        H[7] = (H[7] + h) | 0
      }
      var r = []
      for (var i = 0; i < 8; i++) {
        r.push((H[i] >>> 24) & 0xff, (H[i] >>> 16) & 0xff, (H[i] >>> 8) & 0xff, H[i] & 0xff)
      }
      return r
    }

    function hmac(key, msg) {
      var bs = 64
      if (key.length > bs) key = sha256(key)
      var pk = key.slice()
      while (pk.length < bs) pk.push(0)
      var ok = [],
        ik = []
      for (var i = 0; i < bs; i++) {
        ok.push(pk[i] ^ 0x5c)
        ik.push(pk[i] ^ 0x36)
      }
      return sha256(ok.concat(sha256(ik.concat(msg))))
    }

    function strBytes(s) {
      var b = []
      for (var i = 0; i < s.length; i++) {
        var c = s.charCodeAt(i)
        if (c < 0x80) b.push(c)
        else if (c < 0x800) {
          b.push(0xc0 | (c >> 6))
          b.push(0x80 | (c & 0x3f))
        } else {
          b.push(0xe0 | (c >> 12))
          b.push(0x80 | ((c >> 6) & 0x3f))
          b.push(0x80 | (c & 0x3f))
        }
      }
      return b
    }

    function toHex(bytes) {
      var h = ''
      for (var i = 0; i < bytes.length; i++) h += ('00' + bytes[i].toString(16)).slice(-2)
      return h
    }

    function awsUriEncode(str) {
      return encodeURIComponent(str).replace(/[!'()*]/g, function (c) {
        return '%' + c.charCodeAt(0).toString(16).toUpperCase()
      })
    }

    function uint8ToBase64(bytes) {
      var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
      var len = bytes.length
      var parts = []
      for (var i = 0; i < len; i += 3) {
        var a = bytes[i]
        var b = i + 1 < len ? bytes[i + 1] : 0
        var c = i + 2 < len ? bytes[i + 2] : 0
        parts.push(
          chars[a >> 2],
          chars[((a & 3) << 4) | (b >> 4)],
          i + 1 < len ? chars[((b & 15) << 2) | (c >> 6)] : '=',
          i + 2 < len ? chars[c & 63] : '=',
        )
      }
      return parts.join('')
    }

    function generatePresignedUrl(documentUrl, fileExt) {
      var bucket = $secrets.get('AWS_S3_BUCKET') || 'prd-rg-data-lake'
      var region = $secrets.get('AWS_S3_REGION') || 'us-east-1'
      var host = bucket + '.s3.' + region + '.amazonaws.com'
      var expectedOrigin = 'https://' + host + '/'
      var accessKeyId = $secrets.get('AWS_ACCESS_KEY_ID')
      var secretAccessKey = $secrets.get('AWS_SECRET_ACCESS_KEY')
      var encodedKey = documentUrl.substring(expectedOrigin.length)
      var expires = 300
      var now = new Date()
      var amzDate = now
        .toISOString()
        .replace(/[:\-]/g, '')
        .replace(/\.\d{3}/, '')
      var dateStamp = amzDate.substring(0, 8)
      var credentialScope = dateStamp + '/' + region + '/s3/aws4_request'
      var ext = (fileExt || '').replace(/^\./, '').toLowerCase()
      var mimeTypes = {
        pdf: 'application/pdf',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
      }
      var contentType = mimeTypes[ext] || 'application/octet-stream'
      var params = [
        ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
        ['X-Amz-Credential', accessKeyId + '/' + credentialScope],
        ['X-Amz-Date', amzDate],
        ['X-Amz-Expires', String(expires)],
        ['X-Amz-SignedHeaders', 'host'],
        ['response-content-disposition', 'inline; filename=document.' + (ext || 'bin')],
        ['response-content-type', contentType],
      ]
      var canonicalQuery = params
        .map(function (p) {
          return awsUriEncode(p[0]) + '=' + awsUriEncode(p[1])
        })
        .join('&')
      var canonicalUri = '/' + encodedKey
      var canonicalRequest = [
        'GET',
        canonicalUri,
        canonicalQuery,
        'host:' + host + '\n',
        'host',
        'UNSIGNED-PAYLOAD',
      ].join('\n')
      var stringToSign = [
        'AWS4-HMAC-SHA256',
        amzDate,
        credentialScope,
        toHex(sha256(strBytes(canonicalRequest))),
      ].join('\n')
      var kDate = hmac(strBytes('AWS4' + secretAccessKey), strBytes(dateStamp))
      var kRegion = hmac(kDate, strBytes(region))
      var kService = hmac(kRegion, strBytes('s3'))
      var kSigning = hmac(kService, strBytes('aws4_request'))
      var signature = toHex(hmac(kSigning, strBytes(stringToSign)))
      return (
        'https://' + host + canonicalUri + '?' + canonicalQuery + '&X-Amz-Signature=' + signature
      )
    }

    function getAiAnalysis(rec) {
      var raw = rec.get('ai_analysis')
      if (!raw) return null
      if (typeof raw === 'string') {
        try {
          return JSON.parse(raw)
        } catch (_) {
          return null
        }
      }
      if (typeof raw === 'object') return raw
      return null
    }

    function spSanitize(name) {
      return name
        .replace(/[<>:"/\\|?*#%]/g, '_')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 200)
    }

    function buildSmartFileName(documentKey, extracted, landName, subjectName, fileExt) {
      var fileExtClean = (fileExt || '').replace(/^\./, '')
      var smartFileName = ''

      if (
        documentKey === 'pf_documentos_pessoais' ||
        documentKey === 'pf_documentos_pessoais_conjuge'
      ) {
        var pNome =
          extracted &&
          extracted.nome &&
          extracted.nome !== 'Não Aplicável' &&
          extracted.nome !== 'Não Identificado'
            ? extracted.nome
            : ''
        smartFileName = pNome
          ? 'DOCUMENTO PESSOAL - ' + pNome
          : 'Documento Pessoal - ' + subjectName
      } else if (documentKey === 'pf_comprovante_residencia') {
        var rNome =
          extracted &&
          extracted.nome_titular &&
          extracted.nome_titular !== 'Não Aplicável' &&
          extracted.nome_titular !== 'Não Identificado'
            ? extracted.nome_titular
            : ''
        smartFileName = rNome
          ? 'COMPROVANTE DE RESIDÊNCIA - ' + rNome
          : 'Comprovante de Residência - ' + subjectName
      } else if (documentKey === 'pf_certidao_estado_civil') {
        var cNomes = (extracted && extracted.nomes_mencionados) || []
        var tipoCert = (extracted && extracted.tipo_certidao) || ''
        var validNames = []
        for (var ni = 0; ni < cNomes.length; ni++) {
          if (cNomes[ni] && cNomes[ni] !== 'Não Identificado') validNames.push(cNomes[ni])
        }
        if (validNames.length >= 2 && tipoCert.toLowerCase().indexOf('nascimento') === -1) {
          smartFileName = 'CERTIDÃO DE ESTADO CIVIL - ' + validNames[0] + ' E ' + validNames[1]
        } else if (validNames.length >= 1) {
          smartFileName = 'CERTIDÃO DE ESTADO CIVIL - ' + validNames[0]
        } else {
          smartFileName = 'Certidão de Estado Civil - ' + subjectName
        }
      } else if (documentKey === 'imovel_car') {
        var carNome =
          extracted &&
          extracted.nome_imovel &&
          extracted.nome_imovel !== 'Não Aplicável' &&
          extracted.nome_imovel !== 'Não Identificado'
            ? extracted.nome_imovel
            : ''
        smartFileName = carNome ? 'CAR - ' + carNome : 'CAR - ' + (landName || subjectName)
      } else {
        var docLabels = {
          imovel_certidao_matricula: 'Certidão de Matrícula',
          imovel_ccir: 'CCIR',
          imovel_ditr: 'DITR',
          certidao_ambiental_ibama: 'Certidão IBAMA',
          certidao_ambiental_estadual: 'Certidão Ambiental Estadual',
          certidao_ambiental_municipal: 'Certidão Ambiental Municipal',
          certidao_fiscal_federal: 'Certidão Fiscal Federal',
          certidao_fiscal_estadual: 'Certidão Fiscal Estadual',
          certidao_fiscal_municipal: 'Certidão Fiscal Municipal',
          certidao_fiscal_trabalhista: 'Certidão Fiscal Trabalhista',
        }
        var docLabel = docLabels[documentKey] || documentKey.replace(/_/g, ' ')
        smartFileName = docLabel + ' - ' + (landName || subjectName)
      }

      return spSanitize(smartFileName + '.' + fileExtClean)
    }

    function buildAiPrompt(documentKey) {
      if (documentKey === 'pf_comprovante_residencia') {
        return (
          'Analise a imagem e extraia os dados do comprovante de residência. ' +
          'Retorne APENAS JSON: {"is_comprovante_residencia":true,"nome_titular":"<nome>","endereco_completo":"<endereço>","bairro":"","cidade":"","estado":"","cep":"","tipo_comprovante":"","data_referencia":"","good_visibility":""}. ' +
          'Se não for comprovante: {"is_comprovante_residencia":false,"document_type_detected":"<tipo>","nome_titular":"Não Aplicável","good_visibility":"Não Aplicável"}.'
        )
      }
      if (documentKey === 'pf_certidao_estado_civil') {
        return (
          'Analise a imagem e extraia dados da certidão de estado civil. ' +
          'Retorne APENAS JSON: {"is_certidao_estado_civil":true,"tipo_certidao":"<casamento/nascimento/divórcio>","nomes_mencionados":["<nome1>","<nome2>"],"data_emissao":"","cartorio":"","estado_civil_resultante":"","good_visibility":""}. ' +
          'Se não for certidão: {"is_certidao_estado_civil":false,"document_type_detected":"<tipo>","nomes_mencionados":[],"good_visibility":"Não Aplicável"}. ' +
          'NOMES: apenas nubentes ou pessoa principal, máximo 2.'
        )
      }
      if (documentKey === 'imovel_car') {
        return (
          'Analise a imagem e extraia dados do CAR (Cadastro Ambiental Rural). ' +
          'Retorne APENAS JSON: {"is_car":true,"nome_imovel":"<fazenda/sítio>","numero_car":"","municipio":"","estado":"","area_hectares":"","good_visibility":""}. ' +
          'Se não for CAR: {"is_car":false,"document_type_detected":"<tipo>","nome_imovel":"Não Aplicável","good_visibility":"Não Aplicável"}.'
        )
      }
      return (
        'Analise a imagem e determine se é um documento pessoal brasileiro (RG ou CNH). ' +
        'Retorne APENAS JSON: {"is_personal_document":true,"document_type_detected":"RG" ou "CNH","nome":"","cpf":"","rg":"","estado":"","good_visibility":""}. ' +
        'Se não for RG/CNH: {"is_personal_document":false,"document_type_detected":"<tipo>","nome":"Não Aplicável","good_visibility":"Não Aplicável"}.'
      )
    }

    // ── Lógica principal ────────────────────────────────────────────────
    var authRecord = e.requestInfo().auth
    if (!authRecord || authRecord.getString('role') !== 'admin') {
      return e.forbiddenError('Apenas admins podem reprocessar documentos')
    }

    var filterLandId = String(e.request.url.query().get('land_id') || '').trim()

    var spClientId = $secrets.get('SHAREPOINT_CLIENT_ID')
    var spClientSecret = $secrets.get('SHAREPOINT_CLIENT_SECRET')
    var spTenantId = $secrets.get('SHAREPOINT_TENANT_ID')
    var openrouterKey = $secrets.get('OPENROUTER_API_KEY')

    if (!spClientId || !spClientSecret || !spTenantId) {
      return e.internalServerError('Credenciais do SharePoint não configuradas')
    }

    // Token SharePoint
    var tokenRes = $http.send({
      url: 'https://login.microsoftonline.com/' + spTenantId + '/oauth2/v2.0/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:
        'grant_type=client_credentials&client_id=' +
        encodeURIComponent(spClientId) +
        '&client_secret=' +
        encodeURIComponent(spClientSecret) +
        '&scope=' +
        encodeURIComponent('https://graph.microsoft.com/.default'),
      timeout: 15,
    })
    if (tokenRes.statusCode !== 200 || !tokenRes.json || !tokenRes.json.access_token) {
      return e.internalServerError('Falha ao obter token do SharePoint')
    }
    var spToken = tokenRes.json.access_token

    // Site e drive SharePoint
    var siteRes = $http.send({
      url: 'https://graph.microsoft.com/v1.0/sites/regreencap.sharepoint.com:/sites/-Operacional',
      method: 'GET',
      headers: { Authorization: 'Bearer ' + spToken },
      timeout: 10,
    })
    if (siteRes.statusCode !== 200 || !siteRes.json || !siteRes.json.id) {
      return e.internalServerError('Site do SharePoint não encontrado')
    }
    var siteId = siteRes.json.id

    var drivesRes = $http.send({
      url: 'https://graph.microsoft.com/v1.0/sites/' + siteId + '/drives',
      method: 'GET',
      headers: { Authorization: 'Bearer ' + spToken },
      timeout: 10,
    })
    var driveId = ''
    if (drivesRes.statusCode === 200 && drivesRes.json && drivesRes.json.value) {
      for (var di = 0; di < drivesRes.json.value.length; di++) {
        var drv = drivesRes.json.value[di]
        if (
          drv.name === 'Documentos' ||
          drv.name === 'Documents' ||
          drv.name === 'Documentos Compartilhados'
        ) {
          driveId = drv.id
          break
        }
      }
      if (!driveId && drivesRes.json.value.length > 0) driveId = drivesRes.json.value[0].id
    }
    if (!driveId) {
      return e.internalServerError('Drive do SharePoint não encontrado')
    }

    // Buscar documentos
    var filter = 'document_url != ""'
    if (filterLandId) filter = 'land_id = {:landId} && document_url != ""'
    var allDocs = []
    try {
      allDocs = $app.findRecordsByFilter(
        'document_checks',
        filter,
        '-updated',
        500,
        0,
        filterLandId ? { landId: filterLandId } : {},
      )
    } catch (err) {
      return e.internalServerError('Erro ao buscar documentos: ' + String(err))
    }

    var results = []
    var uploaded = 0
    var analyzed = 0
    var failed = 0
    var landCache = {}
    var subjectCache = {}

    for (var idx = 0; idx < allDocs.length; idx++) {
      var doc = allDocs[idx]
      var docId = doc.id
      var documentKey = doc.getString('document_key')
      var documentUrl = doc.getString('document_url')
      var landId = doc.getString('land_id')
      var subjectId = doc.getString('subject_id')
      var fileExt = (doc.getString('file_ext') || '').toLowerCase()
      var ext = (fileExt || '').replace(/^\./, '').toLowerCase()
      var mimeMap = {
        pdf: 'application/pdf',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
      }
      var contentType = mimeMap[ext] || 'application/octet-stream'

      // Baixar do S3
      var presignedUrl
      try {
        presignedUrl = generatePresignedUrl(documentUrl, fileExt)
      } catch (urlErr) {
        results.push({ id: docId, status: 'error', detail: 'presigned URL: ' + String(urlErr) })
        failed++
        continue
      }

      var s3Response
      try {
        s3Response = $http.send({ url: presignedUrl, method: 'GET', timeout: 60 })
      } catch (dlErr) {
        results.push({ id: docId, status: 'error', detail: 'S3 download: ' + String(dlErr) })
        failed++
        continue
      }
      if (s3Response.statusCode !== 200) {
        results.push({ id: docId, status: 'error', detail: 'S3 status ' + s3Response.statusCode })
        failed++
        continue
      }

      // Análise IA se necessário (ou se análise existente não tem nomes úteis)
      var extracted = getAiAnalysis(doc)
      var needsReanalysis = false
      if (!extracted) {
        needsReanalysis = true
      } else {
        var hasName = false
        if (
          extracted.nome &&
          extracted.nome !== 'Não Aplicável' &&
          extracted.nome !== 'Não Identificado'
        )
          hasName = true
        if (
          extracted.nome_titular &&
          extracted.nome_titular !== 'Não Aplicável' &&
          extracted.nome_titular !== 'Não Identificado'
        )
          hasName = true
        if (
          extracted.nome_imovel &&
          extracted.nome_imovel !== 'Não Aplicável' &&
          extracted.nome_imovel !== 'Não Identificado'
        )
          hasName = true
        if (extracted.nomes_mencionados && extracted.nomes_mencionados.length > 0) hasName = true
        if (!hasName) needsReanalysis = true
      }
      if (needsReanalysis && openrouterKey) {
        try {
          var fileB64 = uint8ToBase64(s3Response.body)
          var dataUrl = 'data:' + contentType + ';base64,' + fileB64
          var prompt = buildAiPrompt(documentKey)

          var aiRes = $http.send({
            url: 'https://openrouter.ai/api/v1/chat/completions',
            method: 'POST',
            headers: {
              Authorization: 'Bearer ' + openrouterKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: prompt },
                    { type: 'image_url', image_url: { url: dataUrl } },
                  ],
                },
              ],
            }),
            timeout: 120,
          })

          if (aiRes.statusCode === 200 && aiRes.json) {
            var aiContent = ''
            try {
              aiContent = aiRes.json.choices[0].message.content || ''
            } catch (_) {}
            aiContent = aiContent
              .replace(/```json\s*/gi, '')
              .replace(/```\s*/g, '')
              .trim()
            try {
              extracted = JSON.parse(aiContent)
              doc.set('ai_analysis', extracted)
              $app.save(doc)
              analyzed++
            } catch (_) {}
          }
        } catch (aiErr) {
          $app.logger().warn('reprocess: AI analysis failed', 'doc', docId, 'error', String(aiErr))
        }
      }

      // Buscar land metadata (com cache)
      if (!landCache[landId]) {
        try {
          var lr = $app.findRecordById('land_metadata', landId)
          landCache[landId] = {
            code: lr.getString('land_code'),
            name: lr.getString('name'),
            clusterSerial: lr.getString('cluster_serial'),
          }
        } catch (_) {
          landCache[landId] = { code: '', name: '', clusterSerial: '' }
        }
      }
      var landName = landCache[landId].name
      var clusterSerial = landCache[landId].clusterSerial

      // Buscar subject (com cache)
      var subjectLabel = 'Geral'
      var subjectKind = ''
      if (subjectId) {
        if (!subjectCache[subjectId]) {
          try {
            var sr = $app.findRecordById('land_subjects', subjectId)
            subjectCache[subjectId] = {
              label: sr.getString('label'),
              kind: sr.getString('kind'),
            }
          } catch (_) {
            subjectCache[subjectId] = { label: 'Geral', kind: '' }
          }
        }
        subjectLabel = subjectCache[subjectId].label
        subjectKind = subjectCache[subjectId].kind
      }

      // Nome real do sujeito
      var smartSubjectName = subjectLabel
      if (subjectKind === 'owner') {
        var ownerName = ''
        if (
          extracted &&
          extracted.nome &&
          extracted.nome !== 'Não Aplicável' &&
          extracted.nome !== 'Não Identificado'
        ) {
          ownerName = extracted.nome
        } else if (
          extracted &&
          extracted.nome_titular &&
          extracted.nome_titular !== 'Não Aplicável' &&
          extracted.nome_titular !== 'Não Identificado'
        ) {
          ownerName = extracted.nome_titular
        }
        if (!ownerName && subjectId) {
          try {
            var prevDocs = $app.findRecordsByFilter(
              'document_checks',
              'subject_id = {:sid} && document_key = "pf_documentos_pessoais"',
              '-updated',
              5,
              0,
              { sid: subjectId },
            )
            for (var pi = 0; pi < prevDocs.length; pi++) {
              var pAn = getAiAnalysis(prevDocs[pi])
              if (
                pAn &&
                pAn.nome &&
                pAn.nome !== 'Não Aplicável' &&
                pAn.nome !== 'Não Identificado'
              ) {
                ownerName = pAn.nome
                break
              }
            }
          } catch (_) {}
        }
        if (ownerName) smartSubjectName = ownerName
      } else if (subjectKind === 'matricula') {
        if (
          extracted &&
          extracted.nome_imovel &&
          extracted.nome_imovel !== 'Não Aplicável' &&
          extracted.nome_imovel !== 'Não Identificado'
        ) {
          smartSubjectName = extracted.nome_imovel
        } else if (landName) {
          smartSubjectName = landName
        }
      }

      var smartFileName = buildSmartFileName(
        documentKey,
        extracted,
        landName,
        smartSubjectName,
        fileExt,
      )
      var spLandFolder = spSanitize(clusterSerial || landCache[landId].code || 'Sem Nome')
      var spSubjectFolder = spSanitize(smartSubjectName)

      // Upload ao SharePoint
      var spFolder = 'Terras/01. Pipeline/Teste Portal DD'
      var spPath = spFolder + '/' + spLandFolder + '/' + spSubjectFolder + '/' + smartFileName
      var uploadUrl =
        'https://graph.microsoft.com/v1.0/drives/' +
        driveId +
        '/root:/' +
        spPath.split('/').map(encodeURIComponent).join('/') +
        ':/content'

      try {
        var spUploadRes = $http.send({
          url: uploadUrl,
          method: 'PUT',
          headers: { Authorization: 'Bearer ' + spToken, 'Content-Type': contentType },
          body: s3Response.body,
          timeout: 120,
        })

        if (spUploadRes.statusCode >= 200 && spUploadRes.statusCode < 300) {
          results.push({ id: docId, status: 'ok', path: spPath })
          uploaded++
        } else {
          results.push({
            id: docId,
            status: 'error',
            detail: 'SharePoint status ' + spUploadRes.statusCode,
          })
          failed++
        }
      } catch (upErr) {
        results.push({ id: docId, status: 'error', detail: 'upload: ' + String(upErr) })
        failed++
      }
    }

    return e.json(200, {
      total: allDocs.length,
      uploaded: uploaded,
      analyzed: analyzed,
      failed: failed,
      results: results,
    })
  },
  $apis.requireAuth(),
)
