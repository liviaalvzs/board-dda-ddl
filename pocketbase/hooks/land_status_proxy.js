routerAdd(
  'GET',
  '/backend/v1/land-status',
  (e) => {
    const apiKey = $secrets.get('VITE_CORE_KEY') || ''

    if (!apiKey) {
      $app.logger().warn('VITE_CORE_KEY secret is not set')
    }

    var landCodes = ''
    var landIds = ''

    try {
      landCodes = e.request.url.query().get('landCodes') || ''
    } catch (_) {}

    try {
      landIds = e.request.url.query().get('landIds') || ''
    } catch (_) {}

    if (!landCodes || !landIds) {
      try {
        const queryMap = e.requestInfo().query || {}
        if (!landCodes) {
          landCodes = queryMap['landCodes'] || queryMap['landcodes'] || queryMap['landCodes'] || ''
        }
        if (!landIds) {
          landIds = queryMap['landIds'] || queryMap['landids'] || queryMap['landIds'] || ''
        }
      } catch (_) {}
    }

    $app
      .logger()
      .info(
        'Land status proxy — parsed query parameters',
        'landCodes',
        landCodes,
        'landIds',
        landIds,
        'rawQueryMap',
        JSON.stringify(e.requestInfo().query || {}),
      )

    var params = []
    if (landIds) {
      params.push('landIds=' + encodeURIComponent(landIds))
    }
    if (landCodes) {
      params.push('landCodes=' + encodeURIComponent(landCodes))
    }

    const baseUrl =
      'https://prdfovmhyc.execute-api.us-east-1.amazonaws.com/api/v1/partner/land-status'
    const targetUrl = params.length > 0 ? baseUrl + '?' + params.join('&') : baseUrl

    var maskedKey = ''
    if (apiKey.length > 8) {
      maskedKey = apiKey.substring(0, 4) + '****' + apiKey.substring(apiKey.length - 4)
    } else if (apiKey.length > 0) {
      maskedKey = '****'
    } else {
      maskedKey = '(empty)'
    }

    $app
      .logger()
      .info(
        'Land status proxy — outgoing request',
        'method',
        'GET',
        'url',
        targetUrl,
        'landCodes',
        landCodes,
        'landIds',
        landIds,
        'headers',
        JSON.stringify({ 'X-API-Key': maskedKey, Accept: 'application/json' }),
        'hasApiKey',
        apiKey ? 'true' : 'false',
        'apiKeyLength',
        String(apiKey.length),
      )

    try {
      const res = $http.send({
        url: targetUrl,
        method: 'GET',
        headers: {
          'X-API-Key': apiKey,
          Accept: 'application/json',
        },
        timeout: 15,
      })

      var rawBody = ''
      try {
        rawBody = String(res.body || '')
      } catch (_) {
        rawBody = '(unable to read body)'
      }

      $app
        .logger()
        .info(
          'Land status proxy — response received',
          'statusCode',
          String(res.statusCode),
          'url',
          targetUrl,
          'rawBodyLength',
          String(rawBody.length),
          'rawBodyPreview',
          rawBody.substring(0, 500),
        )

      if (res.statusCode >= 400) {
        var errorBody = {}
        try {
          errorBody = res.json || {}
        } catch (_) {
          errorBody = { raw: rawBody }
        }

        $app
          .logger()
          .error(
            'Land status proxy — upstream error',
            'statusCode',
            String(res.statusCode),
            'url',
            targetUrl,
            'landCodes',
            landCodes,
            'landIds',
            landIds,
            'errorBody',
            JSON.stringify(errorBody),
            'rawBody',
            rawBody,
            'hasApiKey',
            apiKey ? 'true' : 'false',
            'maskedKey',
            maskedKey,
          )

        return e.json(res.statusCode, {
          error: 'Upstream API error',
          statusCode: res.statusCode,
          details: errorBody,
          rawBody: rawBody,
        })
      }

      return e.json(res.statusCode, res.json || {})
    } catch (err) {
      $app
        .logger()
        .error(
          'Land status proxy — runtime error (network/timeout)',
          'error',
          String(err),
          'url',
          targetUrl,
          'landCodes',
          landCodes,
          'landIds',
          landIds,
          'hasApiKey',
          apiKey ? 'true' : 'false',
          'maskedKey',
          maskedKey,
        )
      return e.json(500, { error: 'Internal server error' })
    }
  },
  $apis.requireAuth(),
)
