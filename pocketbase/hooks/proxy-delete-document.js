routerAdd(
  'POST',
  '/backend/v1/proxy-delete-document',
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

    // Este hook roda com $app (contexto de superusuário), que ignora as regras da
    // collection. A permissão de exclusão do document_checks é admin-only, então
    // precisamos repetir a checagem aqui à mão — senão qualquer usuário
    // autenticado conseguiria apagar arquivo do data lake.
    if (!e.auth || e.auth.getString('role') !== 'admin') {
      return e.forbiddenError('Apenas administradores podem excluir documentos.')
    }

    var body = e.requestInfo().body || {}
    var checkId = String(body.check_id || body.checkId || '').trim()
    if (!checkId) return e.badRequestError('checkId é obrigatório')

    var record
    try {
      record = $app.findRecordById('document_checks', checkId)
    } catch (_) {
      return e.notFoundError('Registro de documento não encontrado')
    }

    var documentUrl = record.getString('document_url')
    var bucket = $secrets.get('AWS_S3_BUCKET') || 'prd-rg-data-lake'
    var region = $secrets.get('AWS_S3_REGION') || 'us-east-1'
    var host = bucket + '.s3.' + region + '.amazonaws.com'
    var expectedOrigin = 'https://' + host + '/'
    var allowedPrefix = 'transient/skip-applications/due_dilligence_control/documents/'

    var s3Deleted = false
    var s3Skipped = ''

    // O document_url já foi um campo editável na interface, então não dá para
    // confiar cegamente nele: só apagamos o objeto se a URL apontar mesmo para o
    // nosso bucket e para dentro da pasta de documentos.
    if (!documentUrl) {
      s3Skipped = 'registro sem document_url'
    } else if (documentUrl.indexOf(expectedOrigin) !== 0) {
      s3Skipped = 'document_url fora do bucket esperado'
    } else {
      var encodedKey = documentUrl.substring(expectedOrigin.length)
      var decodedKey = ''
      try {
        decodedKey = decodeURIComponent(encodedKey)
      } catch (_) {
        decodedKey = encodedKey
      }

      if (decodedKey.indexOf(allowedPrefix) !== 0) {
        s3Skipped = 'document_url fora da pasta de documentos'
      } else {
        var accessKeyId = $secrets.get('AWS_ACCESS_KEY_ID')
        var secretAccessKey = $secrets.get('AWS_SECRET_ACCESS_KEY')
        if (!accessKeyId || !secretAccessKey) {
          $app.logger().error('proxy-delete-document: credenciais AWS não configuradas')
          return e.internalServerError('Credenciais AWS não configuradas')
        }

        var service = 's3'
        var now = new Date()
        var amzDate = now
          .toISOString()
          .replace(/[:\-]/g, '')
          .replace(/\.\d{3}/, '')
        var dateStamp = amzDate.substring(0, 8)

        // A URL guardada já está codificada no mesmo formato usado para assinar
        // o upload, então reaproveitamos o path como veio.
        var canonicalUri = '/' + encodedKey

        var credentialScope = dateStamp + '/' + region + '/' + service + '/aws4_request'
        var credential = accessKeyId + '/' + credentialScope

        var canonicalHeaders =
          'host:' +
          host +
          '\n' +
          'x-amz-content-sha256:UNSIGNED-PAYLOAD\n' +
          'x-amz-date:' +
          amzDate +
          '\n'
        var signedHeaders = 'host;x-amz-content-sha256;x-amz-date'

        var canonicalRequest = [
          'DELETE',
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

        var deleteRes = $http.send({
          url: 'https://' + host + canonicalUri,
          method: 'DELETE',
          headers: {
            Authorization: authorization,
            'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
            'x-amz-date': amzDate,
          },
          timeout: 60,
        })

        // O S3 responde 204 na exclusão e também quando o objeto já não existe.
        if (deleteRes.statusCode < 200 || deleteRes.statusCode >= 300) {
          // A AWS devolve 403 tanto para AccessDenied (falta s3:DeleteObject na
          // credencial) quanto para SignatureDoesNotMatch (erro na assinatura).
          // Só o corpo da resposta distingue os dois, então ele é registrado.
          var s3Error = ''
          try {
            if (typeof deleteRes.body === 'string') {
              s3Error = deleteRes.body
            } else if (deleteRes.body) {
              s3Error = new TextDecoder().decode(deleteRes.body)
            }
          } catch (_) {
            s3Error = ''
          }
          if (!s3Error) {
            try {
              s3Error = String(deleteRes.body || '(sem corpo)')
            } catch (_) {
              s3Error = '(corpo ilegível)'
            }
          }

          $app
            .logger()
            .error(
              'proxy-delete-document: falha ao excluir no S3',
              'status',
              deleteRes.statusCode,
              'key',
              decodedKey,
              'resposta',
              s3Error,
            )

          // Corpo devolvido ao cliente propositalmente: rota é admin-only e o
          // XML de erro da AWS (Code/Message/RequestId) não expõe credenciais.
          // É a única forma de diagnosticar, já que o log de hooks não é
          // acessível por aqui.
          return e.internalServerError(
            'Falha ao excluir no S3 (' + deleteRes.statusCode + '): ' + s3Error.substring(0, 400),
          )
        }

        s3Deleted = true
        $app.logger().info('proxy-delete-document: objeto removido do S3', 'key', decodedKey)
      }
    }

    if (s3Skipped) {
      $app
        .logger()
        .warn('proxy-delete-document: exclusão no S3 ignorada', 'motivo', s3Skipped, 'id', checkId)
    }

    try {
      $app.delete(record)
    } catch (delErr) {
      $app
        .logger()
        .error('proxy-delete-document: falha ao excluir registro', 'error', String(delErr))
      return e.internalServerError('Falha ao excluir o registro: ' + String(delErr))
    }

    return e.json(200, { deleted: true, s3Deleted: s3Deleted, s3Skipped: s3Skipped })
  },
  $apis.requireAuth(),
)
