routerAdd(
  'GET',
  '/backend/v1/land-status',
  (e) => {
    const apiKey = $secrets.get('VITE_CORE_KEY') || ''

    if (!apiKey) {
      $app.logger().warn('VITE_CORE_KEY secret is not set')
    }

    let queryString = ''
    try {
      queryString = e.request.url.rawQuery || ''
    } catch (_) {}

    if (!queryString) {
      const queryMap = e.requestInfo().query || {}
      const parts = []
      for (const key in queryMap) {
        if (Object.prototype.hasOwnProperty.call(queryMap, key)) {
          parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(queryMap[key]))
        }
      }
      queryString = parts.join('&')
    }

    const baseUrl =
      'https://prdfovmhyc.execute-api.us-east-1.amazonaws.com/api/v1/partner/lands/status'
    const targetUrl = queryString ? baseUrl + '?' + queryString : baseUrl

    $app
      .logger()
      .info(
        'Land status proxy — outgoing request',
        'method',
        'GET',
        'url',
        targetUrl,
        'queryString',
        queryString,
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

      $app
        .logger()
        .info(
          'Land status proxy — response received',
          'statusCode',
          String(res.statusCode),
          'url',
          targetUrl,
        )

      if (res.statusCode >= 400) {
        let errorBody = {}
        try {
          errorBody = res.json || {}
        } catch (_) {
          errorBody = { raw: String(res.body || '') }
        }

        $app
          .logger()
          .error(
            'Land status proxy — upstream error',
            'statusCode',
            String(res.statusCode),
            'url',
            targetUrl,
            'queryString',
            queryString,
            'errorBody',
            JSON.stringify(errorBody),
            'hasApiKey',
            apiKey ? 'true' : 'false',
          )

        return e.json(res.statusCode, {
          error: 'Upstream API error',
          statusCode: res.statusCode,
          details: errorBody,
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
          'queryString',
          queryString,
          'hasApiKey',
          apiKey ? 'true' : 'false',
        )
      return e.json(500, { error: 'Internal server error' })
    }
  },
  $apis.requireAuth(),
)
