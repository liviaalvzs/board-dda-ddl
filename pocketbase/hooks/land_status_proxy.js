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

      if (res.statusCode >= 400) {
        return e.json(res.statusCode, {
          error: 'Upstream API error',
          statusCode: res.statusCode,
          details: res.json || {},
        })
      }

      return e.json(res.statusCode, res.json || {})
    } catch (err) {
      $app.logger().error('Land status proxy error', 'error', String(err))
      return e.json(500, { error: 'Internal server error' })
    }
  },
  $apis.requireAuth(),
)
