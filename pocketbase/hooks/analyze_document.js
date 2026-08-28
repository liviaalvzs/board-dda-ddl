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

    function getAiAnalysis(record) {
      var raw = record.get('ai_analysis')
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

    var prompt = ''

    if (documentKey === 'pf_comprovante_residencia') {
      // Tenta buscar nome do proprietário para cross-reference (opcional)
      var nomeProprietario = ''
      try {
        var pessoaisDocs = $app.findRecordsByFilter(
          'document_checks',
          'land_id = {:landId} && document_key = "pf_documentos_pessoais"',
          '-updated',
          10,
          0,
          { landId: landId },
        )
        for (var pi = 0; pi < pessoaisDocs.length; pi++) {
          var pAnalysis = getAiAnalysis(pessoaisDocs[pi])
          if (pAnalysis && pAnalysis.nome && pAnalysis.nome !== 'Não Aplicável') {
            nomeProprietario = pAnalysis.nome
            break
          }
        }
      } catch (_) {}

      prompt =
        'Analise a imagem enviada e determine se é um comprovante de residência brasileiro ' +
        '(conta de luz, água, gás, telefone, internet, extrato bancário, correspondência oficial, etc.).\n\n' +
        'Se NÃO for um comprovante de residência, retorne APENAS este JSON:\n' +
        '{\n  "is_comprovante_residencia": false,\n  "document_type_detected": "<descreva o que é>",\n  "nome_titular": "Não Aplicável",\n  "endereco_completo": "Não Aplicável",\n  "bairro": "Não Aplicável",\n  "cidade": "Não Aplicável",\n  "estado": "Não Aplicável",\n  "cep": "Não Aplicável",\n  "tipo_comprovante": "Não Aplicável",\n  "data_referencia": "Não Aplicável",\n  "good_visibility": "Não Aplicável"\n}\n\n' +
        'Se FOR um comprovante de residência, retorne APENAS este JSON:\n' +
        '{\n  "is_comprovante_residencia": true,\n  "document_type_detected": "Comprovante de Residência",\n  "nome_titular": "<nome completo do titular>",\n  "endereco_completo": "<rua/avenida, número, complemento>",\n  "bairro": "<bairro>",\n  "cidade": "<cidade>",\n  "estado": "<UF>",\n  "cep": "<CEP>",\n  "tipo_comprovante": "<conta de luz, água, telefone, etc.>",\n  "data_referencia": "<mês/ano de referência ou data de emissão>",\n  "good_visibility": ""\n}\n\n' +
        'Regras de extração:\n' +
        '1. **NOME TITULAR**: Nome da pessoa ou empresa que consta como titular/destinatário do documento\n' +
        '2. **ENDEREÇO**: Extraia rua, número, complemento, bairro, cidade, estado e CEP separadamente\n' +
        '3. **TIPO**: Identifique a concessionária/empresa e tipo (energia, água, gás, telefone, internet, banco, correios)\n' +
        '4. **DATA**: Mês/ano de referência da conta ou data de emissão\n' +
        '5. Se ilegível ou ausente → "Não Identificado"\n' +
        '6. Retorne APENAS o JSON, sem markdown, sem texto adicional.\n' +
        '7. **VISIBILIDADE (good_visibility)** — OBRIGATÓRIO retornar APENAS um destes três valores: "alta", "média" ou "baixa". NÃO retorne true/false.\n' +
        '   - "alta": TODOS os campos importantes estão nítidos e legíveis sem esforço.\n' +
        '   - "média": Alguns campos legíveis, outros parcialmente cortados ou embaçados.\n' +
        '   - "baixa": Documento muito embaçado, escuro, cortado ou ilegível.\n' +
        '   Seja RIGOROSO: na dúvida entre dois níveis, escolha o MENOR.'

      if (nomeProprietario) {
        prompt +=
          '\n\nIMPORTANTE: O nome de referência do proprietário é "' +
          nomeProprietario +
          '". ' +
          'Compare com o nome do titular do comprovante e indique se são a mesma pessoa.'
      }
    } else if (documentKey === 'pf_certidao_estado_civil') {
      // Tenta buscar nome do proprietário para cross-reference (opcional)
      var nomeReferencia = ''
      try {
        var allDocs = $app.findRecordsByFilter(
          'document_checks',
          'land_id = {:landId} && document_key = "pf_documentos_pessoais"',
          '-updated',
          10,
          0,
          { landId: landId },
        )
        for (var di = 0; di < allDocs.length; di++) {
          var analysis = getAiAnalysis(allDocs[di])
          if (analysis && analysis.nome && analysis.nome !== 'Não Aplicável') {
            nomeReferencia = analysis.nome
            break
          }
        }
      } catch (_) {}

      prompt =
        'Analise a imagem enviada e determine se é uma certidão de estado civil brasileira ' +
        '(certidão de casamento, nascimento, divórcio, óbito, ou averbação).\n\n' +
        'Se NÃO for uma certidão de estado civil, retorne APENAS este JSON:\n' +
        '{\n  "is_certidao_estado_civil": false,\n  "document_type_detected": "<descreva o que é>",\n  "tipo_certidao": "Não Aplicável",\n  "nomes_mencionados": [],\n  "data_emissao": "Não Aplicável",\n  "cartorio": "Não Aplicável",\n  "estado_civil_resultante": "Não Aplicável",\n  "good_visibility": "Não Aplicável"\n}\n\n' +
        'Se FOR uma certidão de estado civil, retorne APENAS este JSON:\n' +
        '{\n  "is_certidao_estado_civil": true,\n  "document_type_detected": "Certidão de Estado Civil",\n  "tipo_certidao": "<casamento, nascimento, divórcio, óbito ou averbação>",\n  "nomes_mencionados": ["<nome completo 1>", "<nome completo 2>", ...],\n  "data_emissao": "<dd/mm/aaaa>",\n  "cartorio": "<nome do cartório>",\n  "estado_civil_resultante": "<solteiro, casado, divorciado, viúvo>",\n  "good_visibility": ""\n}\n\n' +
        'Regras de extração:\n' +
        '1. **TIPO**: Identifique se é certidão de casamento, nascimento, divórcio, óbito ou averbação\n' +
        '2. **NOMES**: Extraia APENAS os nomes do casal (nubentes) ou da pessoa principal do registro. NÃO inclua pais, testemunhas, oficiais ou outros. Máximo 2 nomes.\n' +
        '3. **DATA DE EMISSÃO**: Data em que a certidão foi emitida\n' +
        '4. **CARTÓRIO**: Nome COMPLETO do cartório emissor, sem cortar. Inclua cidade e estado se visíveis.\n' +
        '5. **ESTADO CIVIL RESULTANTE**: O estado civil que resulta deste documento (casado, solteiro, divorciado, viúvo)\n' +
        '6. Se ilegível ou ausente → "Não Identificado"\n' +
        '7. Retorne APENAS o JSON, sem markdown, sem texto adicional.\n' +
        '8. **VISIBILIDADE (good_visibility)** — OBRIGATÓRIO retornar APENAS um destes três valores: "alta", "média" ou "baixa". NÃO retorne true/false.\n' +
        '   - "alta": TODOS os campos importantes estão nítidos e legíveis sem esforço.\n' +
        '   - "média": Alguns campos legíveis, outros parcialmente cortados ou embaçados.\n' +
        '   - "baixa": Documento muito embaçado, escuro, cortado ou ilegível.\n' +
        '   Seja RIGOROSO: na dúvida entre dois níveis, escolha o MENOR.'

      if (nomeReferencia) {
        prompt +=
          '\n\nIMPORTANTE: O nome de referência do proprietário é "' +
          nomeReferencia +
          '". ' +
          'Verifique se este nome aparece entre os nomes mencionados na certidão.'
      }
    } else if (documentKey === 'imovel_certidao_matricula') {
      prompt =
        'Analise a imagem enviada e determine se é uma Certidão de Matrícula de imóvel rural.\n\n' +
        'Se NÃO for uma Certidão de Matrícula, retorne APENAS este JSON:\n' +
        '{\n  "is_certidao_matricula": false,\n  "document_type_detected": "<descreva o que é>",\n  "nome_imovel": "Não Aplicável",\n  "numero_matricula": "Não Aplicável",\n  "cartorio": "Não Aplicável",\n  "municipio": "Não Aplicável",\n  "estado": "Não Aplicável",\n  "area_hectares": "Não Aplicável",\n  "good_visibility": "Não Aplicável"\n}\n\n' +
        'Se FOR uma Certidão de Matrícula, retorne APENAS este JSON:\n' +
        '{\n  "is_certidao_matricula": true,\n  "document_type_detected": "Certidão de Matrícula",\n  "nome_imovel": "<nome da fazenda/sítio/chácara/propriedade>",\n  "numero_matricula": "<número da matrícula>",\n  "cartorio": "<nome do cartório>",\n  "municipio": "<município>",\n  "estado": "<UF>",\n  "area_hectares": "<área em hectares>",\n  "good_visibility": ""\n}\n\n' +
        'Regras de extração:\n' +
        '1. **NOME DO IMÓVEL**: Procure por "denominação", nome da fazenda, sítio, chácara ou propriedade rural mencionada\n' +
        '2. **NÚMERO DA MATRÍCULA**: Número do registro no cartório\n' +
        '3. **CARTÓRIO**: Nome completo do cartório de registro de imóveis\n' +
        '4. **MUNICÍPIO/ESTADO**: Localização do imóvel\n' +
        '5. **ÁREA**: Área total em hectares\n' +
        '6. Se ilegível ou ausente → "Não Identificado"\n' +
        '7. Retorne APENAS o JSON, sem markdown, sem texto adicional.\n' +
        '8. **VISIBILIDADE (good_visibility)** — OBRIGATÓRIO retornar APENAS um destes três valores: "alta", "média" ou "baixa". NÃO retorne true/false.\n' +
        '   - "alta": TODOS os campos importantes estão nítidos e legíveis.\n' +
        '   - "média": Alguns campos legíveis, outros parcialmente cortados ou embaçados.\n' +
        '   - "baixa": Documento muito embaçado, escuro, cortado ou ilegível.\n' +
        '   Seja RIGOROSO: na dúvida entre dois níveis, escolha o MENOR.'
    } else if (documentKey === 'imovel_car') {
      prompt =
        'Analise a imagem enviada e determine se é um CAR (Cadastro Ambiental Rural) brasileiro.\n\n' +
        'Se NÃO for um CAR, retorne APENAS este JSON:\n' +
        '{\n  "is_car": false,\n  "document_type_detected": "<descreva o que é>",\n  "nome_imovel": "Não Aplicável",\n  "numero_car": "Não Aplicável",\n  "municipio": "Não Aplicável",\n  "estado": "Não Aplicável",\n  "area_hectares": "Não Aplicável",\n  "good_visibility": "Não Aplicável"\n}\n\n' +
        'Se FOR um CAR, retorne APENAS este JSON:\n' +
        '{\n  "is_car": true,\n  "document_type_detected": "CAR",\n  "nome_imovel": "<nome da propriedade/fazenda/sítio>",\n  "numero_car": "<código do CAR ex: PA-1234567-...>",\n  "municipio": "<município>",\n  "estado": "<UF>",\n  "area_hectares": "<área total em hectares>",\n  "good_visibility": ""\n}\n\n' +
        'Regras de extração:\n' +
        '1. **NOME DO IMÓVEL**: Nome da propriedade rural (fazenda, sítio, chácara, etc.) conforme registrado no CAR\n' +
        '2. **NÚMERO CAR**: Código completo do registro no SICAR\n' +
        '3. **MUNICÍPIO/ESTADO**: Localização do imóvel\n' +
        '4. **ÁREA**: Área total em hectares\n' +
        '5. Se ilegível ou ausente → "Não Identificado"\n' +
        '6. Retorne APENAS o JSON, sem markdown, sem texto adicional.\n' +
        '7. **VISIBILIDADE (good_visibility)** — OBRIGATÓRIO retornar APENAS um destes três valores: "alta", "média" ou "baixa". NÃO retorne true/false.\n' +
        '   - "alta": TODOS os campos importantes estão nítidos e legíveis sem esforço.\n' +
        '   - "média": Alguns campos legíveis, outros parcialmente cortados ou embaçados.\n' +
        '   - "baixa": Documento muito embaçado, escuro, cortado ou ilegível.\n' +
        '   Seja RIGOROSO: na dúvida entre dois níveis, escolha o MENOR.'
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
        '7. **VISIBILIDADE (good_visibility)** — OBRIGATÓRIO retornar APENAS um destes três valores: "alta", "média" ou "baixa". NÃO retorne true/false.\n' +
        '   - "alta": TODOS os campos importantes estão nítidos e legíveis sem esforço.\n' +
        '   - "média": Alguns campos legíveis, outros parcialmente cortados ou embaçados.\n' +
        '   - "baixa": Documento muito embaçado, escuro, cortado ou ilegível.\n' +
        '   Seja RIGOROSO: na dúvida entre dois níveis, escolha o MENOR.'
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
      return e.internalServerError('Erro da IA (status ' + aiResponse.statusCode + ')')
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

    // --- SharePoint upload com nomes inteligentes ---
    try {
      var spClientId = $secrets.get('SHAREPOINT_CLIENT_ID')
      var spClientSecret = $secrets.get('SHAREPOINT_CLIENT_SECRET')
      var spTenantId = $secrets.get('SHAREPOINT_TENANT_ID')

      if (spClientId && spClientSecret && spTenantId) {
        var landRecord = null
        try {
          landRecord = $app.findFirstRecordByFilter('land_metadata', 'external_id = {:eid}', {
            eid: landId,
          })
        } catch (_) {}
        var landName = landRecord ? landRecord.getString('name') : ''
        var clusterSerial = landRecord ? landRecord.getString('cluster_serial') : ''

        var subjectId = record.getString('subject_id')
        var subjectRecord = null
        try {
          if (subjectId) subjectRecord = $app.findRecordById('land_subjects', subjectId)
        } catch (_) {}
        var subjectLabel = subjectRecord ? subjectRecord.getString('label') : 'Geral'
        var subjectKind = subjectRecord ? subjectRecord.getString('kind') : ''

        // Determinar nome real do sujeito
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
              for (var oi = 0; oi < prevDocs.length; oi++) {
                var oAn = getAiAnalysis(prevDocs[oi])
                if (
                  oAn &&
                  oAn.nome &&
                  oAn.nome !== 'Não Aplicável' &&
                  oAn.nome !== 'Não Identificado'
                ) {
                  ownerName = oAn.nome
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

        // Montar nome inteligente do arquivo
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
            : 'Documento Pessoal - ' + smartSubjectName
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
            : 'Comprovante de Residência - ' + smartSubjectName
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
            smartFileName = 'Certidão de Estado Civil - ' + smartSubjectName
          }
        } else if (documentKey === 'imovel_car') {
          var carNome =
            extracted &&
            extracted.nome_imovel &&
            extracted.nome_imovel !== 'Não Aplicável' &&
            extracted.nome_imovel !== 'Não Identificado'
              ? extracted.nome_imovel
              : ''
          smartFileName = carNome ? 'CAR - ' + carNome : 'CAR - ' + (landName || smartSubjectName)
        } else if (documentKey === 'imovel_certidao_matricula') {
          var matNome =
            extracted &&
            extracted.nome_imovel &&
            extracted.nome_imovel !== 'Não Aplicável' &&
            extracted.nome_imovel !== 'Não Identificado'
              ? extracted.nome_imovel
              : ''
          smartFileName = matNome
            ? 'CERTIDÃO DE MATRÍCULA - ' + matNome
            : 'Certidão de Matrícula - ' + (landName || smartSubjectName)
        } else {
          var docLabels = {
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
          smartFileName = docLabel + ' - ' + (landName || smartSubjectName)
        }

        smartFileName = smartFileName + '.' + fileExtClean

        function spSanitize(name) {
          return name
            .replace(/[<>:"/\\|?*#%]/g, '_')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 200)
        }

        var spLandFolder = spSanitize(clusterSerial || landName || 'Sem Nome')
        smartFileName = spSanitize(smartFileName)

        var tokenRes = $http.send({
          url: 'https://login.microsoftonline.com/' + spTenantId + '/oauth2/v2.0/token',
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body:
            'grant_type=client_credentials' +
            '&client_id=' +
            encodeURIComponent(spClientId) +
            '&client_secret=' +
            encodeURIComponent(spClientSecret) +
            '&scope=' +
            encodeURIComponent('https://graph.microsoft.com/.default'),
          timeout: 15,
        })

        if (tokenRes.statusCode === 200 && tokenRes.json && tokenRes.json.access_token) {
          var spToken = tokenRes.json.access_token

          var siteRes = $http.send({
            url: 'https://graph.microsoft.com/v1.0/sites/regreencap.sharepoint.com:/sites/-Operacional',
            method: 'GET',
            headers: { Authorization: 'Bearer ' + spToken },
            timeout: 10,
          })

          if (siteRes.statusCode === 200 && siteRes.json && siteRes.json.id) {
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
              if (!driveId && drivesRes.json.value.length > 0) {
                driveId = drivesRes.json.value[0].id
              }
            }

            if (driveId) {
              var spFolder = 'Terras/01. Pipeline/Teste Portal DD'
              var spPath = spFolder + '/' + spLandFolder + '/' + smartFileName
              var uploadUrl =
                'https://graph.microsoft.com/v1.0/drives/' +
                driveId +
                '/root:/' +
                spPath.split('/').map(encodeURIComponent).join('/') +
                ':/content'

              var spUploadRes = $http.send({
                url: uploadUrl,
                method: 'PUT',
                headers: {
                  Authorization: 'Bearer ' + spToken,
                  'Content-Type': mimeType,
                },
                body: s3Response.body,
                timeout: 120,
              })

              if (spUploadRes.statusCode >= 200 && spUploadRes.statusCode < 300) {
                $app.logger().info('analyze-document: SharePoint upload OK', 'path', spPath)
              } else {
                $app
                  .logger()
                  .warn(
                    'analyze-document: SharePoint upload failed',
                    'status',
                    spUploadRes.statusCode,
                  )
              }
            }
          }
        }
      }
    } catch (spErr) {
      $app
        .logger()
        .warn('analyze-document: SharePoint error (non-blocking)', 'error', String(spErr))
    }

    return e.json(200, { extracted: extracted })
  },
  $apis.requireAuth(),
)
