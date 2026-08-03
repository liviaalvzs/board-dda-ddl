routerAdd(
  'POST',
  '/backend/v1/document-file-url',
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

    function awsUriEncode(str) {
      return encodeURIComponent(str).replace(/[!'()*]/g, function (c) {
        return '%' + c.charCodeAt(0).toString(16).toUpperCase()
      })
    }

    var body = e.requestInfo().body || {}
    var checkId = String(body.check_id || body.checkId || '').trim()
    var disposition = body.disposition === 'attachment' ? 'attachment' : 'inline'

    if (!checkId) return e.badRequestError('checkId é obrigatório')

    var record
    try {
      record = $app.findRecordById('document_checks', checkId)
    } catch (_) {
      return e.notFoundError('Documento não encontrado')
    }

    var documentUrl = record.getString('document_url')
    if (!documentUrl) return e.notFoundError('Este documento não possui arquivo no S3.')

    var bucket = $secrets.get('AWS_S3_BUCKET') || 'prd-rg-data-lake'
    var region = $secrets.get('AWS_S3_REGION') || 'us-east-1'
    var host = bucket + '.s3.' + region + '.amazonaws.com'
    var expectedOrigin = 'https://' + host + '/'
    var allowedPrefix = 'transient/skip-applications/due_dilligence_control/documents/'

    // Mesma validação da rota de exclusão: o document_url já foi editável na
    // interface, então não pode virar um gerador de acesso a objeto arbitrário.
    if (documentUrl.indexOf(expectedOrigin) !== 0) {
      $app.logger().warn('document-file-url: URL fora do bucket', 'id', checkId)
      return e.badRequestError('Arquivo fora do repositório esperado.')
    }

    var encodedKey = documentUrl.substring(expectedOrigin.length)
    var decodedKey = ''
    try {
      decodedKey = decodeURIComponent(encodedKey)
    } catch (_) {
      decodedKey = encodedKey
    }

    if (decodedKey.indexOf(allowedPrefix) !== 0) {
      $app.logger().warn('document-file-url: chave fora da pasta de documentos', 'id', checkId)
      return e.badRequestError('Arquivo fora do repositório esperado.')
    }

    var accessKeyId = $secrets.get('AWS_ACCESS_KEY_ID')
    var secretAccessKey = $secrets.get('AWS_SECRET_ACCESS_KEY')
    if (!accessKeyId || !secretAccessKey) {
      $app.logger().error('document-file-url: credenciais AWS não configuradas')
      return e.internalServerError('Credenciais AWS não configuradas')
    }

    var filename = decodedKey.substring(decodedKey.lastIndexOf('/') + 1)
    var contentDisposition =
      disposition === 'attachment'
        ? 'attachment; filename="' + filename.replace(/"/g, '') + '"'
        : 'inline'

    // URL pré-assinada de curta duração (SigV4 na query string). O bucket
    // continua privado: o link concede leitura de um único objeto e expira.
    var expires = 300
    var now = new Date()
    var amzDate = now
      .toISOString()
      .replace(/[:\-]/g, '')
      .replace(/\.\d{3}/, '')
    var dateStamp = amzDate.substring(0, 8)
    var credentialScope = dateStamp + '/' + region + '/s3/aws4_request'

    // A query canônica precisa estar ordenada por nome. Os 'X-Amz-*' (0x58)
    // vêm antes de 'response-*' (0x72) na ordem ASCII.
    var params = [
      ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
      ['X-Amz-Credential', accessKeyId + '/' + credentialScope],
      ['X-Amz-Date', amzDate],
      ['X-Amz-Expires', String(expires)],
      ['X-Amz-SignedHeaders', 'host'],
      ['response-content-disposition', contentDisposition],
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

    var url =
      'https://' + host + canonicalUri + '?' + canonicalQuery + '&X-Amz-Signature=' + signature

    return e.json(200, { url: url, filename: filename, expiresIn: expires })
  },
  $apis.requireAuth(),
)
