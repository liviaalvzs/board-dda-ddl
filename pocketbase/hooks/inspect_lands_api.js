routerAdd(
  'GET',
  '/backend/v1/inspect-lands',
  (e) => {
    const apiKey = $secrets.get('VITE_CORE_KEY') || ''

    if (!apiKey) {
      return e.json(500, { error: 'VITE_CORE_KEY secret is not set' })
    }

    const baseUrl = 'https://prdfovmhyc.execute-api.us-east-1.amazonaws.com/api/v1/partner/lands'

    try {
      const res = $http.send({
        url: baseUrl,
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

      const data = res.json || {}

      var lands = []
      if (Array.isArray(data)) {
        lands = data
      } else if (data.data && Array.isArray(data.data)) {
        lands = data.data
      } else if (data.lands && Array.isArray(data.lands)) {
        lands = data.lands
      } else if (data.items && Array.isArray(data.items)) {
        lands = data.items
      } else if (data.results && Array.isArray(data.results)) {
        lands = data.results
      }

      var sample = lands.slice(0, 5)

      var analysis = []
      for (var i = 0; i < sample.length; i++) {
        var land = sample[i]
        var fields = {}
        var patternMatches = []
        var uuidMatches = []

        for (var key in land) {
          if (!Object.prototype.hasOwnProperty.call(land, key)) continue
          var value = land[key]
          if (value === null || value === undefined) {
            fields[key] = { value: '(null)', type: 'null' }
            continue
          }
          if (typeof value === 'object') {
            fields[key] = { value: JSON.stringify(value).substring(0, 200), type: 'object' }
            continue
          }
          var strValue = String(value)
          fields[key] = {
            value: strValue.length > 200 ? strValue.substring(0, 200) + '...' : strValue,
            type: typeof value,
          }

          if (/^[A-Z]{2,6}[-]?\d{2,6}$/.test(strValue)) {
            patternMatches.push({ field: key, value: strValue })
          }

          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(strValue)) {
            uuidMatches.push({ field: key, value: strValue })
          }
        }

        analysis.push({
          index: i,
          fields: fields,
          patternMatches: patternMatches,
          uuidMatches: uuidMatches,
          allFieldNames: Object.keys(land),
        })
      }

      var allFieldUnion = {}
      for (var j = 0; j < lands.length; j++) {
        for (var k in lands[j]) {
          if (Object.prototype.hasOwnProperty.call(lands[j], k)) {
            allFieldUnion[k] = true
          }
        }
      }

      return e.json(200, {
        totalLands: lands.length,
        responseStructure: Array.isArray(data) ? 'array' : 'object',
        topLevelKeys: Array.isArray(data) ? [] : Object.keys(data),
        allFieldNames: Object.keys(allFieldUnion),
        sampleLands: analysis,
      })
    } catch (err) {
      $app.logger().error('Inspect lands API error', 'error', String(err))
      return e.json(500, { error: 'Internal server error', details: String(err) })
    }
  },
  $apis.requireAuth(),
)
