routerAdd(
  'GET',
  '/backend/v1/land-status',
  (e) => {
    const apiKey = $secrets.get('VITE_CORE_KEY') || ''

    if (!apiKey) {
      $app.logger().warn('VITE_CORE_KEY secret is not set')
    }

    // Extract landCodes from the incoming query string
    let landCodes = ''
    try {
      landCodes = e.request.url.query().get('landCodes') || ''
    } catch (_) {}

    if (!landCodes) {
      // Fallback: try requestInfo().query
      try {
        const queryMap = e.requestInfo().query || {}
        landCodes = queryMap['landCodes'] || queryMap['landcodes'] || ''
      } catch (_) {}
    }

    // Build the target URL — only send landCodes to the external AWS API
    // Omit limit, offset, statusGroupNames and any other unsupported params
    const baseUrl =
      'https://prdfovmhyc.execute-api.us-east-1.amazonaws.com/api/v1/partner/land-status'
    const targetUrl = landCodes ? baseUrl + '?landCodes=' + encodeURIComponent(landCodes) : baseUrl

    // Mask the API key for logging (show only first 4 and last 4 characters)
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

      // Capture the raw response body for logging
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
