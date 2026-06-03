routerAdd(
  'GET',
  '/backend/v1/lands/{id}',
  (e) => {
    const id = e.request.pathValue('id')
    const url = 'https://prdfovmhyc.execute-api.us-east-1.amazonaws.com/api/v1/partner/lands/' + id
    const apiKey = $secrets.get('VITE_CORE_KEY') || ''

    const res = $http.send({
      url: url,
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
      },
      timeout: 15,
    })

    return e.json(res.statusCode, res.json || { message: 'Failed to parse JSON' })
  },
  $apis.requireAuth(),
)
