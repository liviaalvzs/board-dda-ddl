routerAdd(
  'POST',
  '/backend/v1/analyze-document',
  (e) => {
    // ── Helpers de assinatura S3 (copiados de document_file_url.js) ──────
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

    // ── Helpers ─────────────────────────────────────────────────────────
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

    // ── Lógica principal ────────────────────────────────────────────────
    var body = e.requestInfo().body || {}
    var checkId = String(body.check_id || '').trim()

    if (!checkId) return e.badRequestError('check_id é obrigatório')

    var record
    try {
      record = $app.findRecordById('document_checks', checkId)
    } catch (_) {
      return e.notFoundError('Documento não encontrado')
    }

    var documentUrl = record.getString('document_url')
    if (!documentUrl) return e.notFoundError('Este documento não possui arquivo.')

    var openrouterKey = $secrets.get('OPENROUTER_API_KEY')
    if (!openrouterKey) return e.internalServerError('OPENROUTER_API_KEY não configurada')

    var fileExt = (record.getString('file_ext') || '').toLowerCase()
    var presignedUrl = generatePresignedUrl(documentUrl, fileExt)

    // Baixa o arquivo do S3 no backend (sem CORS)
    var s3Response
    try {
      s3Response = $http.send({ url: presignedUrl, method: 'GET', timeout: 60 })
    } catch (err) {
      $app.logger().error('analyze-document: S3 download failed', 'error', String(err))
      return e.internalServerError('Erro ao baixar o arquivo do S3.')
    }

    if (s3Response.statusCode !== 200) {
      $app.logger().error('analyze-document: S3 returned error', 'status', s3Response.statusCode)
      return e.internalServerError(
        'Erro ao baixar o arquivo do S3 (status ' + s3Response.statusCode + ')',
      )
    }

    // Converte bytes para base64 data URL
    var ext = (fileExt || '').replace(/^\./, '').toLowerCase()
    var mimeMap = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    }
    var mimeType = mimeMap[ext] || 'application/octet-stream'
    var fileB64 = uint8ToBase64(s3Response.body)
    var dataUrl = 'data:' + mimeType + ';base64,' + fileB64

    var documentKey = record.getString('document_key')
    var landId = record.getString('land_id')
    var subjectId = record.getString('subject_id') || ''

    var prompt = ''

    if (documentKey === 'pf_certidao_estado_civil') {
      // Verifica se documentos pessoais já foram analisados
      var pessoaisRecord = null
      try {
        pessoaisRecord = $app.findFirstRecordByFilter(
          'document_checks',
          'land_id = "' +
            landId.replace(/"/g, '\\"') +
            '" && document_key = "pf_documentos_pessoais" && subject_id = "' +
            subjectId.replace(/"/g, '\\"') +
            '" && is_completed = true',
        )
      } catch (_) {}

      var pessoaisAnalysis = pessoaisRecord ? pessoaisRecord.get('ai_analysis') : null
      if (!pessoaisAnalysis || !pessoaisAnalysis.nome) {
        return e.badRequestError(
          'É necessário analisar os Documentos Pessoais antes da Certidão de Estado Civil.',
        )
      }

      var nomeReferencia = pessoaisAnalysis.nome || ''

      prompt =
        'Analise a imagem enviada e determine se é uma certidão de estado civil brasileira ' +
        '(certidão de casamento, nascimento, divórcio, óbito, ou averbação).\n\n' +
        'Se NÃO for uma certidão de estado civil, retorne APENAS este JSON:\n' +
        '{\n  "is_certidao_estado_civil": false,\n  "document_type_detected": "<descreva o que é>",\n  "tipo_certidao": "Não Aplicável",\n  "nomes_mencionados": [],\n  "data_emissao": "Não Aplicável",\n  "cartorio": "Não Aplicável",\n  "estado_civil_resultante": "Não Aplicável",\n  "good_visibility": "Não Aplicável"\n}\n\n' +
        'Se FOR uma certidão de estado civil, retorne APENAS este JSON:\n' +
        '{\n  "is_certidao_estado_civil": true,\n  "document_type_detected": "Certidão de Estado Civil",\n  "tipo_certidao": "<casamento, nascimento, divórcio, óbito ou averbação>",\n  "nomes_mencionados": ["<nome completo 1>", "<nome completo 2>", ...],\n  "data_emissao": "<dd/mm/aaaa>",\n  "cartorio": "<nome do cartório>",\n  "estado_civil_resultante": "<solteiro, casado, divorciado, viúvo>",\n  "good_visibility": ""\n}\n\n' +
        'Regras de extração:\n' +
        '1. **TIPO**: Identifique se é certidão de casamento, nascimento, divórcio, óbito ou averbação\n' +
        '2. **NOMES**: Extraia TODOS os nomes completos de pessoas mencionadas na certidão (nubentes, registrado, falecido, etc.)\n' +
        '3. **DATA DE EMISSÃO**: Data em que a certidão foi emitida\n' +
        '4. **CARTÓRIO**: Nome completo do cartório emissor\n' +
        '5. **ESTADO CIVIL RESULTANTE**: O estado civil que resulta deste documento (casado, solteiro, divorciado, viúvo)\n' +
        '6. Se ilegível ou ausente → "Não Identificado"\n' +
        '7. Retorne APENAS o JSON, sem markdown, sem texto adicional.\n' +
        '8. Em "good_visibility" traga "alta", "média" ou "baixa" a depender da qualidade\n\n' +
        'IMPORTANTE: O nome de referência do proprietário é "' +
        nomeReferencia +
        '". ' +
        'Verifique se este nome aparece entre os nomes mencionados na certidão.'
    } else {
      prompt =
        'Analise a imagem enviada e determine se é um documento pessoal brasileiro (RG ou CNH).\n\n' +
        'Se NÃO for um documento pessoal (RG ou CNH), retorne APENAS este JSON:\n' +
        '{\n  "is_personal_document": false,\n  "document_type_detected": "<descreva o que é: certidão, contrato, comprovante, etc.>",\n  "nome": "Não Aplicável",\n  "cpf": "Não Aplicável",\n  "rg": "Não Aplicável",\n  "estado": "Não Aplicável",\n  "good_visibility": "Não Aplicável"\n}\n\n' +
        'Se FOR um documento pessoal (RG ou CNH), retorne APENAS este JSON:\n' +
        '{\n  "is_personal_document": true,\n  "document_type_detected": "RG" ou "CNH",\n  "nome": "",\n  "cpf": "",\n  "rg": "",\n  "estado": "",\n  "good_visibility": ""\n}\n\n' +
        'Regras de extração (apenas para RG ou CNH):\n' +
        '1. **NOME**: Campo explicitamente rotulado como "NOME" no documento. Ignorar "FILIAÇÃO"\n' +
        '2. **CPF**: Número com formato XXX.XXX.XXX-XX\n' +
        '3. **RG**: Campo rotulado como "RG", "REGISTRO GERAL" ou "IDENTIDADE" — geralmente um número mais curto (6 a 9 dígitos)\n' +
        '4. **ESTADO**: Estado emissor do documento (ex: "PARÁ", "SP", "RJ")\n' +
        '5. Se ilegível ou ausente → "Não Identificado"\n' +
        '6. Retorne APENAS o JSON, sem markdown, sem texto adicional.\n' +
        '7. Em "good_visibility" traga "alta", "média" ou "baixa" a depender da qualidade do documento'
    }

    var contentParts = [{ type: 'text', text: prompt }]
    contentParts.push({
      type: 'image_url',
      image_url: { url: dataUrl },
    })

    var aiResponse
    try {
      aiResponse = $http.send({
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
              content: contentParts,
            },
          ],
        }),
        timeout: 120,
      })
    } catch (err) {
      $app.logger().error('analyze-document: OpenRouter request failed', 'error', String(err))
      return e.internalServerError('Erro ao chamar a IA: ' + String(err))
    }

    if (aiResponse.statusCode !== 200) {
      var errBody = ''
      try {
        errBody = new TextDecoder().decode(aiResponse.body)
      } catch (_) {
        errBody = '(unable to read body)'
      }
      $app
        .logger()
        .error(
          'analyze-document: OpenRouter returned error',
          'status',
          aiResponse.statusCode,
          'body',
          errBody,
        )
      return e.json(aiResponse.statusCode, {
        error: 'Erro da IA (status ' + aiResponse.statusCode + ')',
        details: errBody,
      })
    }

    var parsed
    try {
      parsed = aiResponse.json
    } catch (_) {
      return e.internalServerError('Resposta da IA inválida')
    }

    var content = ''
    try {
      content = parsed.choices[0].message.content || ''
    } catch (_) {
      return e.internalServerError('Resposta da IA sem conteúdo')
    }

    content = content
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim()

    var extracted
    try {
      extracted = JSON.parse(content)
    } catch (_) {
      $app.logger().warn('analyze-document: failed to parse AI response as JSON', 'raw', content)
      return e.json(200, { raw: content, extracted: null })
    }

    record.set('ai_analysis', extracted)
    try {
      $app.save(record)
    } catch (saveErr) {
      $app
        .logger()
        .error('analyze-document: failed to persist ai_analysis', 'error', String(saveErr))
    }

    return e.json(200, { extracted: extracted })
  },
  $apis.requireAuth(),
)
