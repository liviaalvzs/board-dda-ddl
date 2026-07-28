routerAdd(
  'GET',
  '/backend/v1/lands',
  (e) => {
    const apiKey = $secrets.get('VITE_CORE_KEY') || ''

    if (!apiKey) {
      $app.logger().error('VITE_CORE_KEY secret is not set — lands proxy cannot call external API')
      return e.json(500, { error: 'API key not configured' })
    }

    var hasShapeParam = false
    var rawQuery = ''
    try {
      rawQuery = e.request.url.rawQuery || ''
      if (rawQuery.indexOf('includesShapeWgs84') !== -1) {
        hasShapeParam = true
      }
    } catch (_) {}

    if (!rawQuery) {
      var queryMap = e.requestInfo().query || {}
      var parts = []
      for (var key in queryMap) {
        if (Object.prototype.hasOwnProperty.call(queryMap, key)) {
          parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(queryMap[key]))
          if (key === 'includesShapeWgs84') hasShapeParam = true
        }
      }
      rawQuery = parts.join('&')
    }

    var baseUrl = 'https://prdfovmhyc.execute-api.us-east-1.amazonaws.com/api/v1/partner/lands'
    var targetUrl = rawQuery ? baseUrl + '?' + rawQuery : baseUrl

    $app.logger().info('Lands proxy request', 'url', targetUrl, 'hasShape', hasShapeParam)

    try {
      var res = $http.send({
        url: targetUrl,
        method: 'GET',
        headers: {
          'X-API-Key': apiKey,
          Accept: 'application/json',
        },
        timeout: 30,
      })

      if (res.statusCode >= 400) {
        $app
          .logger()
          .error('Lands proxy upstream error', 'statusCode', res.statusCode, 'url', targetUrl)
        return e.json(res.statusCode, {
          error: 'Upstream API error',
          statusCode: res.statusCode,
          details: res.json || {},
        })
      }

      var body = res.json || {}
      var landCount = 0
      if (Array.isArray(body)) {
        landCount = body.length
      } else if (body.data && Array.isArray(body.data)) {
        landCount = body.data.length
      } else if (body.items && Array.isArray(body.items)) {
        landCount = body.items.length
      }

      $app
        .logger()
        .info('Lands proxy success', 'landsReturned', landCount, 'statusCode', res.statusCode)

      return e.json(res.statusCode, body)
    } catch (err) {
      $app.logger().error('Lands proxy error', 'error', String(err), 'url', targetUrl)
      return e.json(500, { error: 'Internal server error', details: String(err) })
    }
  },
  $apis.requireAuth(),
)
