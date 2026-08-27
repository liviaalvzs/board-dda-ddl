routerAdd(
  'POST',
  '/backend/v1/proxy-upload',
  (e) => {
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
      m.push(0)
      m.push(0)
      m.push(0)
      m.push(0)
      m.push((bl >>> 24) & 0xff)
      m.push((bl >>> 16) & 0xff)
      m.push((bl >>> 8) & 0xff)
      m.push(bl & 0xff)
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
        r.push((H[i] >>> 24) & 0xff)
        r.push((H[i] >>> 16) & 0xff)
        r.push((H[i] >>> 8) & 0xff)
        r.push(H[i] & 0xff)
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

    // AWS SigV4 exige RFC 3986: tudo exceto A-Z a-z 0-9 - _ . ~ deve ser
    // percent-encoded. encodeURIComponent deixa !'()* passar, o que quebraria a
    // assinatura em nomes como "Certidão Negativa Federal (CND Federal)".
    function awsUriEncode(str) {
      return encodeURIComponent(str).replace(/[!'()*]/g, function (c) {
        return '%' + c.charCodeAt(0).toString(16).toUpperCase()
      })
    }

    // Mantém acentos e espaços (o nome precisa ser legível no data lake), mas
    // remove o que não pode aparecer em nome de arquivo — em especial "/", que
    // criaria uma subpasta indesejada no S3.
    function sanitizeFilename(str) {
      return str
        .replace(/[\\/:*?"<>|]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    }

    var body = e.requestInfo().body || {}
    var landId = String(body.land_id || body.landId || '').trim()
    var documentKey = String(body.document_key || body.documentKey || '').trim()
    var landCode = String(body.land_code || body.landCode || body.clusterSerial || '').trim()
    // Proprietário ou matrícula a que este envio pertence. Vazio = terra sem
    // sujeitos cadastrados, o comportamento anterior à multiplicação.
    var subjectId = String(body.subject_id || body.subjectId || '').trim()

    if (!landId) return e.badRequestError('landId é obrigatório')
    if (!documentKey) return e.badRequestError('documentKey é obrigatório')

    if (!landCode) {
      try {
        var landMeta = $app.findFirstRecordByFilter(
          'land_metadata',
          'external_id = "' + landId.replace(/"/g, '\\"') + '"',
        )
        landCode = landMeta.getString('cluster_serial') || landId
      } catch (_) {
        landCode = landId
      }
    }

    var files = e.findUploadedFiles('file')
    if (!files || files.length === 0) return e.badRequestError('Nenhum arquivo enviado')
    var fh = files[0]
    var filename = fh.Name || fh.name || (fh.Header && fh.Header.Filename) || 'upload'

    var maxSize = 10 * 1024 * 1024
    if ((fh.Size || fh.size || (fh.Header && fh.Header.Size) || 0) > maxSize) {
      return e.badRequestError('O arquivo excede o tamanho máximo de 10 MB.')
    }

    var ext = filename.toLowerCase().substring(filename.lastIndexOf('.'))
    var allowedExts = ['.pdf', '.jpg', '.jpeg', '.png']
    if (allowedExts.indexOf(ext) === -1) {
      return e.badRequestError('Tipo de arquivo não permitido. Aceitos: PDF, JPG, PNG.')
    }

    var userId = e.auth ? e.auth.id : ''
    var record
    var wasCompleted = false
    try {
      record = $app.findFirstRecordByFilter(
        'document_checks',
        'land_id = "' +
          landId.replace(/"/g, '\\"') +
          '" && document_key = "' +
          documentKey.replace(/"/g, '\\"') +
          '" && subject_id = "' +
          subjectId.replace(/"/g, '\\"') +
          '"',
      )
      wasCompleted =
        record.getBool('is_completed') &&
        !!(record.getString('document_url') || record.getString('document_file'))
    } catch (_) {
      // O registro nasce aqui, dentro da mesma operação que envia o arquivo.
      // Antes ele era criado pelo frontend antes do upload, o que deixava linhas
      // órfãs (sem arquivo e sem autor) sempre que o envio falhava no meio.
      var checksCol = $app.findCollectionByNameOrId('document_checks')
      record = new Record(checksCol)
      record.set('land_id', landId)
      record.set('document_key', documentKey)
      record.set('subject_id', subjectId)
      record.set('is_completed', false)
    }

    if (userId) record.set('user', userId)

    // Desfaz o registro se o envio falhar depois deste ponto. Um documento que
    // já estava concluído antes desta tentativa é preservado: não podemos apagar
    // um envio bom por causa de uma substituição que deu errado.
    function cleanupOnFailure() {
      if (wasCompleted) return
      try {
        $app.delete(record)
      } catch (cleanupErr) {
        $app.logger().warn('proxy-upload: falha ao limpar registro', 'error', String(cleanupErr))
      }
    }

    record.set('document_file', fh)
    try {
      $app.save(record)
    } catch (saveErr) {
      $app.logger().error('proxy-upload: failed to save document_file', 'error', String(saveErr))
      cleanupOnFailure()
      return e.badRequestError('Falha ao salvar o arquivo: ' + String(saveErr))
    }

    var pbUrl = $secrets.get('PB_INSTANCE_URL') || ''
    if (!pbUrl) {
      pbUrl = 'https://' + e.request.host
    }
    var storedFile = record.getString('document_file')
    var fileUrl = pbUrl + '/api/files/document_checks/' + record.id + '/' + storedFile
    var authHeader = e.request.header.get('Authorization') || ''

    var downloadRes = $http.send({
      url: fileUrl,
      method: 'GET',
      headers: { Authorization: authHeader },
      timeout: 60,
    })

    if (downloadRes.statusCode !== 200) {
      $app
        .logger()
        .error('proxy-upload: failed to download file from PB', 'status', downloadRes.statusCode)
      cleanupOnFailure()
      return e.internalServerError('Falha ao ler arquivo enviado')
    }

    var accessKeyId = $secrets.get('AWS_ACCESS_KEY_ID')
    var secretAccessKey = $secrets.get('AWS_SECRET_ACCESS_KEY')
    var bucket = $secrets.get('AWS_S3_BUCKET') || 'prd-rg-data-lake'
    var region = $secrets.get('AWS_S3_REGION') || 'us-east-1'

    if (!accessKeyId || !secretAccessKey) {
      $app.logger().error('proxy-upload: AWS credentials not configured')
      cleanupOnFailure()
      return e.internalServerError('Credenciais AWS não configuradas')
    }

    // O arquivo sobe renomeado com o nome do documento cadastrado em
    // document_types, no formato "<Nome do documento> - <código da terra>.<ext>".
    var docName = documentKey
    try {
      var docType = $app.findFirstRecordByData('document_types', 'key', documentKey)
      docName = docType.getString('name') || documentKey
    } catch (_) {
      $app.logger().warn('proxy-upload: document_type não encontrado', 'key', documentKey)
    }

    // O sujeito entra no nome do arquivo. Sem isso, dois proprietários (ou duas
    // matrículas) enviando o mesmo tipo de documento gerariam a MESMA chave: o
    // segundo envio seria tratado como substituição e arquivaria o primeiro
    // como " OLD", com a pessoa achando que tem os dois.
    var subjectLabel = ''
    if (subjectId) {
      try {
        subjectLabel = $app.findRecordById('land_subjects', subjectId).getString('label') || ''
      } catch (_) {
        $app.logger().warn('proxy-upload: sujeito não encontrado', 'subject_id', subjectId)
      }
    }

    // A chave do arquivo ATUAL não leva extensão de propósito: assim uma
    // substituição por outro tipo (PNG -> PDF) sobrescreve exatamente a mesma
    // chave, em vez de criar uma segunda e deixar a antiga órfã. Sem permissão
    // de exclusão no bucket, essa é a única forma de não acumular resíduo.
    // O tipo real fica no Content-Type e em document_checks.file_ext.
    //
    // Sem sujeito, a chave é exatamente a de antes — nenhum arquivo já enviado
    // muda de lugar.
    var safeLandCode = landCode.replace(/[^a-zA-Z0-9._-]/g, '_')
    var safeFilename = sanitizeFilename(
      docName + ' - ' + landCode + (subjectLabel ? ' - ' + subjectLabel : ''),
    )
    var s3Key =
      'transient/skip-applications/due_dilligence_control/documents/' +
      safeLandCode +
      '/' +
      safeFilename

    var contentTypeByExt = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
    }
    var contentType = contentTypeByExt[ext] || 'application/octet-stream'
    var service = 's3'
    var now = new Date()
    var amzDate = now
      .toISOString()
      .replace(/[:\-]/g, '')
      .replace(/\.\d{3}/, '')
    var dateStamp = amzDate.substring(0, 8)
    var host = bucket + '.s3.' + region + '.amazonaws.com'
    var canonicalUri = '/' + s3Key.split('/').map(awsUriEncode).join('/')

    var credentialScope = dateStamp + '/' + region + '/' + service + '/aws4_request'
    var credential = accessKeyId + '/' + credentialScope

    var canonicalHeaders =
      'content-type:' +
      contentType +
      '\n' +
      'host:' +
      host +
      '\n' +
      'x-amz-content-sha256:UNSIGNED-PAYLOAD\n' +
      'x-amz-date:' +
      amzDate +
      '\n'
    var signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date'

    var canonicalRequest = [
      'PUT',
      canonicalUri,
      '',
      canonicalHeaders,
      signedHeaders,
      'UNSIGNED-PAYLOAD',
    ].join('\n')

    var canonicalHash = toHex(sha256(strBytes(canonicalRequest)))
    var stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, canonicalHash].join('\n')

    var kDate = hmac(strBytes('AWS4' + secretAccessKey), strBytes(dateStamp))
    var kRegion = hmac(kDate, strBytes(region))
    var kService = hmac(kRegion, strBytes(service))
    var kSigning = hmac(kService, strBytes('aws4_request'))
    var signature = toHex(hmac(kSigning, strBytes(stringToSign)))

    var authorization =
      'AWS4-HMAC-SHA256 Credential=' +
      credential +
      ', SignedHeaders=' +
      signedHeaders +
      ', Signature=' +
      signature

    // Precisa usar exatamente o mesmo path codificado da assinatura, senão o S3
    // recalcula outro canonical request e devolve SignatureDoesNotMatch.
    var s3Url = 'https://' + host + canonicalUri

    // Substituição: o arquivo que já está lá é COPIADO para "<nome> OLD.<ext>"
    // antes de ser sobrescrito. Nada é apagado do S3 — a cópia usa apenas
    // CopyObject (GetObject na origem + PutObject no destino).
    var previousUrl = record.getString('document_url')
    var expectedOrigin = 'https://' + host + '/'
    var replacedCount = Number(record.get('replaced_count') || 0)

    if (previousUrl && previousUrl.indexOf(expectedOrigin) === 0) {
      var previousEncodedKey = previousUrl.substring(expectedOrigin.length)
      var previousDecodedKey = ''
      try {
        previousDecodedKey = decodeURIComponent(previousEncodedKey)
      } catch (_) {
        previousDecodedKey = previousEncodedKey
      }

      // A chave anterior não tem extensão; ela vem de file_ext e só é usada
      // para nomear a cópia arquivada, que é imutável.
      var prevExt = record.getString('file_ext') || ''
      var oldSuffix = replacedCount === 0 ? ' OLD' : ' OLD ' + replacedCount
      var archiveKey = previousDecodedKey + oldSuffix + prevExt
      var archiveUri = '/' + archiveKey.split('/').map(awsUriEncode).join('/')

      var copySource = '/' + bucket + '/' + previousEncodedKey
      var copyAmzDate = new Date()
        .toISOString()
        .replace(/[:\-]/g, '')
        .replace(/\.\d{3}/, '')
      var copyDateStamp = copyAmzDate.substring(0, 8)
      var copyScope = copyDateStamp + '/' + region + '/' + service + '/aws4_request'

      var copyCanonicalHeaders =
        'host:' +
        host +
        '\n' +
        'x-amz-content-sha256:UNSIGNED-PAYLOAD\n' +
        'x-amz-copy-source:' +
        copySource +
        '\n' +
        'x-amz-date:' +
        copyAmzDate +
        '\n'
      var copySignedHeaders = 'host;x-amz-content-sha256;x-amz-copy-source;x-amz-date'

      var copyCanonicalRequest = [
        'PUT',
        archiveUri,
        '',
        copyCanonicalHeaders,
        copySignedHeaders,
        'UNSIGNED-PAYLOAD',
      ].join('\n')

      var copyStringToSign = [
        'AWS4-HMAC-SHA256',
        copyAmzDate,
        copyScope,
        toHex(sha256(strBytes(copyCanonicalRequest))),
      ].join('\n')

      var ckDate = hmac(strBytes('AWS4' + secretAccessKey), strBytes(copyDateStamp))
      var ckRegion = hmac(ckDate, strBytes(region))
      var ckService = hmac(ckRegion, strBytes(service))
      var ckSigning = hmac(ckService, strBytes('aws4_request'))
      var copySignature = toHex(hmac(ckSigning, strBytes(copyStringToSign)))

      var copyRes = $http.send({
        url: 'https://' + host + archiveUri,
        method: 'PUT',
        headers: {
          Authorization:
            'AWS4-HMAC-SHA256 Credential=' +
            accessKeyId +
            '/' +
            copyScope +
            ', SignedHeaders=' +
            copySignedHeaders +
            ', Signature=' +
            copySignature,
          'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
          'x-amz-copy-source': copySource,
          'x-amz-date': copyAmzDate,
        },
        timeout: 120,
      })

      if (copyRes.statusCode < 200 || copyRes.statusCode >= 300) {
        var copyErrBody = ''
        try {
          copyErrBody =
            typeof copyRes.body === 'string'
              ? copyRes.body
              : new TextDecoder().decode(copyRes.body || new Uint8Array())
        } catch (_) {
          copyErrBody = ''
        }

        // Aborta em vez de seguir: sobrescrever agora destruiria a versão
        // anterior, que é justamente o que o arquivamento existe para evitar.
        $app
          .logger()
          .error(
            'proxy-upload: falha ao arquivar versão anterior',
            'status',
            copyRes.statusCode,
            'origem',
            previousDecodedKey,
            'destino',
            archiveKey,
            'resposta',
            copyErrBody,
          )
        cleanupOnFailure()
        return e.internalServerError(
          'Não foi possível arquivar a versão anterior no S3 (' +
            copyRes.statusCode +
            '): ' +
            copyErrBody.substring(0, 300),
        )
      }

      // Registros antigos apontam para chaves COM extensão (formato anterior).
      // Essas não serão sobrescritas pelo novo PUT e ficam no bucket como
      // resíduo — sem permissão de exclusão, só a limpeza manual resolve.
      if (previousDecodedKey !== s3Key) {
        $app
          .logger()
          .warn(
            'proxy-upload: chave anterior em formato antigo permanece no bucket',
            'chave',
            previousDecodedKey,
          )
      }

      replacedCount = replacedCount + 1
    }

    var uploadRes = $http.send({
      url: s3Url,
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        Authorization: authorization,
        'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
        'x-amz-date': amzDate,
      },
      body: downloadRes.body,
      timeout: 120,
    })

    if (uploadRes.statusCode < 200 || uploadRes.statusCode >= 300) {
      $app.logger().error('proxy-upload: S3 upload failed', 'status', uploadRes.statusCode)
      cleanupOnFailure()
      return e.internalServerError('Falha no upload para S3: ' + uploadRes.statusCode)
    }

    record.set('document_url', s3Url)
    record.set('is_completed', true)
    record.set('replaced_count', replacedCount)
    if (wasCompleted) record.set('ai_analysis', null)
    record.set('file_ext', ext)
    record.set('document_file', null)

    // --- Notificação de documento enviado ---
    try {
      var actorName = ''
      if (e.auth) actorName = e.auth.getString('name') || e.auth.email() || ''
      var landName = landCode
      try {
        var lm = $app.findFirstRecordByFilter(
          'land_metadata',
          'external_id = "' + landId.replace(/"/g, '\\"') + '"',
        )
        landName = lm.getString('name') || lm.getString('cluster_serial') || landCode
      } catch (_) {}
      var notifSubjectLabel = subjectLabel || ''
      var notifTitle = docName + (notifSubjectLabel ? ' - ' + notifSubjectLabel : '')
      var notifCol = $app.findCollectionByNameOrId('notifications')
      var notif = new Record(notifCol)
      notif.set('type', 'document')
      notif.set('title', notifTitle)
      notif.set('message', 'Enviado por ' + (actorName || 'usuário') + ' para ' + landName)
      notif.set('land_id', landId)
      notif.set('land_name', landName)
      notif.set('actor_name', actorName)
      $app.save(notif)
    } catch (notifErr) {
      $app.logger().warn('proxy-upload: falha ao criar notificação', 'error', String(notifErr))
    }
    try {
      $app.save(record)
    } catch (finalSaveErr) {
      $app
        .logger()
        .error('proxy-upload: failed to save document_url', 'error', String(finalSaveErr))
      cleanupOnFailure()
      return e.internalServerError('Falha ao atualizar registro: ' + String(finalSaveErr))
    }

    // --- SharePoint upload (best-effort, não bloqueia o fluxo principal) ---
    try {
      var spClientId = $secrets.get('SHAREPOINT_CLIENT_ID')
      var spClientSecret = $secrets.get('SHAREPOINT_CLIENT_SECRET')
      var spTenantId = $secrets.get('SHAREPOINT_TENANT_ID')

      if (spClientId && spClientSecret && spTenantId) {
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
          var spSiteHost = 'regreencap.sharepoint.com'
          var spSitePath = '/sites/-Operacional'
          var spFolder = 'Terras/01. Pipeline/Teste Portal DD'
          var spFileName = safeFilename + ext

          var siteRes = $http.send({
            url: 'https://graph.microsoft.com/v1.0/sites/' + spSiteHost + ':' + spSitePath,
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
              var spPath = spFolder + '/' + spFileName
              var uploadUrl =
                'https://graph.microsoft.com/v1.0/drives/' +
                driveId +
                '/root:/' +
                encodeURIComponent(spPath).replace(/%2F/g, '/') +
                ':/content'

              var spUploadRes = $http.send({
                url: uploadUrl,
                method: 'PUT',
                headers: {
                  Authorization: 'Bearer ' + spToken,
                  'Content-Type': contentType,
                },
                body: downloadRes.body,
                timeout: 120,
              })

              if (spUploadRes.statusCode >= 200 && spUploadRes.statusCode < 300) {
                $app
                  .logger()
                  .info(
                    'proxy-upload: SharePoint upload OK',
                    'path',
                    spPath,
                    'status',
                    spUploadRes.statusCode,
                  )
              } else {
                var spErrBody = ''
                try {
                  spErrBody =
                    typeof spUploadRes.body === 'string'
                      ? spUploadRes.body
                      : new TextDecoder().decode(spUploadRes.body || new Uint8Array())
                } catch (_) {
                  spErrBody = ''
                }
                $app
                  .logger()
                  .warn(
                    'proxy-upload: SharePoint upload failed',
                    'status',
                    spUploadRes.statusCode,
                    'body',
                    spErrBody.substring(0, 500),
                  )
              }
            } else {
              $app.logger().warn('proxy-upload: SharePoint drive not found')
            }
          } else {
            $app
              .logger()
              .warn('proxy-upload: SharePoint site not found', 'status', siteRes.statusCode)
          }
        } else {
          $app.logger().warn('proxy-upload: SharePoint token failed', 'status', tokenRes.statusCode)
        }
      }
    } catch (spErr) {
      $app.logger().warn('proxy-upload: SharePoint error (non-blocking)', 'error', String(spErr))
    }

    return e.json(200, { url: s3Url, key: s3Key })
  },
  $apis.requireAuth(),
)
