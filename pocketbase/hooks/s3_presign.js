// @deps crypto-js@4.2.0
routerAdd(
  'POST',
  '/backend/v1/s3-presign',
  (e) => {
    const CryptoJS = require('crypto-js')

    const body = e.requestInfo().body || {}
    const landCode = (body.land_code || '').trim()
    const filename = (body.filename || '').trim()

    if (!landCode) {
      return e.badRequestError('land_code é obrigatório')
    }
    if (!filename) {
      return e.badRequestError('filename é obrigatório')
    }

    const accessKeyId = $secrets.get('AWS_ACCESS_KEY_ID')
    const secretAccessKey = $secrets.get('AWS_SECRET_ACCESS_KEY')
    const bucket = $secrets.get('AWS_S3_BUCKET') || 'prd-rg-data-lake'
    const region = $secrets.get('AWS_S3_REGION') || 'us-east-1'

    if (!accessKeyId || !secretAccessKey) {
      $app.logger().error('S3 presign: AWS credentials not configured')
      return e.json(500, { error: 'Credenciais AWS não configuradas' })
    }

    var safeLandCode = landCode.replace(/[^a-zA-Z0-9._-]/g, '_')
    var safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    var key =
      'transient/skip-applications/due_dilligence_control/documents/' +
      safeLandCode +
      '/' +
      safeFilename

    var service = 's3'
    var method = 'PUT'

    var now = new Date()
    var amzDate = now
      .toISOString()
      .replace(/[:\-]/g, '')
      .replace(/\.\d{3}/, '')
    var dateStamp = amzDate.substring(0, 8)

    var host = bucket + '.s3.' + region + '.amazonaws.com'

    var canonicalUri = '/' + key.split('/').map(encodeURIComponent).join('/')

    var credentialScope = dateStamp + '/' + region + '/' + service + '/aws4_request'
    var credential = accessKeyId + '/' + credentialScope

    var canonicalQueryParams = {
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': credential,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': '3600',
      'X-Amz-SignedHeaders': 'host',
    }

    var sortedQueryKeys = Object.keys(canonicalQueryParams).sort()
    var canonicalQueryString = sortedQueryKeys
      .map(function (k) {
        return encodeURIComponent(k) + '=' + encodeURIComponent(canonicalQueryParams[k])
      })
      .join('&')

    var canonicalHeaders = 'host:' + host + '\n'
    var signedHeaders = 'host'
    var payloadHash = 'UNSIGNED-PAYLOAD'

    var canonicalRequest = [
      method,
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n')

    var stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      CryptoJS.SHA256(canonicalRequest).toString(CryptoJS.enc.Hex),
    ].join('\n')

    var kSecret = CryptoJS.enc.Utf8.parse('AWS4' + secretAccessKey)
    var kDate = CryptoJS.HmacSHA256(dateStamp, kSecret)
    var kRegion = CryptoJS.HmacSHA256(region, kDate)
    var kService = CryptoJS.HmacSHA256(service, kRegion)
    var kSigning = CryptoJS.HmacSHA256('aws4_request', kService)

    var signature = CryptoJS.HmacSHA256(stringToSign, kSigning).toString(CryptoJS.enc.Hex)

    var presignedUrl =
      'https://' +
      host +
      canonicalUri +
      '?' +
      canonicalQueryString +
      '&X-Amz-Signature=' +
      signature

    var publicUrl = 'https://' + host + '/' + key

    return e.json(200, {
      presignedUrl: presignedUrl,
      publicUrl: publicUrl,
      key: key,
    })
  },
  $apis.requireAuth(),
)
