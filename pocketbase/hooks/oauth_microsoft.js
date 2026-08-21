routerAdd('POST', '/backend/v1/auth/microsoft-callback', (e) => {
  var body = e.requestInfo().body || {}
  var code = body.code || ''
  var codeVerifier = body.codeVerifier || ''
  var redirectUrl = body.redirectUrl || ''

  if (!code || !codeVerifier || !redirectUrl) {
    return e.json(400, { error: 'Parâmetros ausentes (code, codeVerifier, redirectUrl).' })
  }

  var clientId = $secrets.get('MS_OAUTH_CLIENT_ID')
  var clientSecret = $secrets.get('MS_OAUTH_CLIENT_SECRET')
  var tenantId = $secrets.get('MS_OAUTH_TENANT_ID')

  if (!clientId || !clientSecret || !tenantId) {
    $app.logger().error('Microsoft OAuth secrets not configured')
    return e.json(500, { error: 'OAuth não configurado no servidor.' })
  }

  var tokenUrl = 'https://login.microsoftonline.com/' + tenantId + '/oauth2/v2.0/token'

  var tokenBody = [
    'grant_type=authorization_code',
    'client_id=' + encodeURIComponent(clientId),
    'client_secret=' + encodeURIComponent(clientSecret),
    'code=' + encodeURIComponent(code),
    'redirect_uri=' + encodeURIComponent(redirectUrl),
    'code_verifier=' + encodeURIComponent(codeVerifier),
  ].join('&')

  try {
    var tokenRes = $http.send({
      url: tokenUrl,
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody,
      timeout: 15,
    })

    if (tokenRes.statusCode !== 200) {
      $app
        .logger()
        .error(
          'MS token exchange failed',
          'status',
          tokenRes.statusCode,
          'body',
          JSON.stringify(tokenRes.json || {}),
        )
      return e.json(400, { error: 'Falha ao trocar código com a Microsoft.' })
    }

    var tokens = tokenRes.json || {}
    var accessToken = tokens.access_token || ''

    if (!accessToken) {
      return e.json(400, { error: 'Token de acesso não retornado pela Microsoft.' })
    }

    // Get user info from Microsoft Graph
    var userInfoRes = $http.send({
      url: 'https://graph.microsoft.com/v1.0/me',
      method: 'GET',
      headers: { Authorization: 'Bearer ' + accessToken },
      timeout: 10,
    })

    if (userInfoRes.statusCode !== 200) {
      $app.logger().error('MS userinfo failed', 'status', userInfoRes.statusCode)
      return e.json(400, { error: 'Falha ao obter dados do usuário Microsoft.' })
    }

    var msUser = userInfoRes.json || {}
    var email = (msUser.mail || msUser.userPrincipalName || '').toLowerCase().trim()
    var displayName = msUser.displayName || ''

    if (!email) {
      return e.json(400, { error: 'E-mail não encontrado na conta Microsoft.' })
    }

    $app.logger().info('MS OAuth user', 'email', email, 'name', displayName)

    // Admins by email
    var adminEmails = ['maria.palma@re.green', 'lucas.lamare@re.green', 'livia.santana@re.green']
    var isAdmin = adminEmails.indexOf(email) !== -1
    var userRole = isAdmin ? 'admin' : 'negociador'

    // Find existing user by email
    var record = null
    try {
      record = $app.findAuthRecordByEmail('users', email)
    } catch (_) {
      // not found
    }

    if (record) {
      var changed = false
      if (!record.getString('name') && displayName) {
        record.set('name', displayName)
        changed = true
      }
      // Sync role on every login
      if (record.getString('role') !== userRole) {
        record.set('role', userRole)
        changed = true
      }
      if (changed) $app.save(record)
      return $apis.recordAuthResponse(e, record)
    }

    // Create new user
    var collection = $app.findCollectionByNameOrId('users')
    var newUser = new Record(collection)
    newUser.setEmail(email)
    newUser.setPassword($security.randomString(30))
    newUser.setVerified(true)
    newUser.set('name', displayName)
    newUser.set('role', userRole)
    $app.save(newUser)

    $app.logger().info('MS OAuth new user created', 'email', email, 'id', newUser.id)

    return $apis.recordAuthResponse(e, newUser)
  } catch (err) {
    $app.logger().error('Microsoft OAuth error', 'error', String(err))
    return e.json(500, { error: 'Falha na autenticação: ' + String(err) })
  }
})
