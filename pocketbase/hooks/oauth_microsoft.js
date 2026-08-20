routerAdd('POST', '/backend/v1/auth/microsoft-callback', (e) => {
  var body = $apis.requestInfo(e).body || {}
  var code = body.code || ''
  var state = body.state || ''
  var codeVerifier = body.codeVerifier || ''
  var redirectUrl = body.redirectUrl || ''

  if (!code || !codeVerifier || !redirectUrl) {
    return e.json(400, { error: 'Parâmetros ausentes (code, codeVerifier, redirectUrl).' })
  }

  try {
    var authResult = $app.findAuthRecordByOAuth2Code('oidc', code, codeVerifier, redirectUrl)

    if (authResult.record) {
      var token = authResult.record.newAuthToken()
      return e.json(200, { token: token, record: authResult.record })
    }

    // User not found — check if email already exists
    var oauthUser = authResult.oAuth2User
    if (!oauthUser || !oauthUser.email) {
      return e.json(400, { error: 'Não foi possível obter o e-mail da conta Microsoft.' })
    }

    var existing = null
    try {
      existing = $app.findAuthRecordByEmail('users', oauthUser.email)
    } catch (_) {
      // not found
    }

    if (existing) {
      // Link OAuth to existing user
      var externalAuth = new ExternalAuth({
        collectionRef: 'users',
        recordRef: existing.id,
        provider: 'oidc',
        providerId: oauthUser.id,
      })
      $app.save(externalAuth)

      if (!existing.get('name') && oauthUser.name) {
        existing.set('name', oauthUser.name)
        $app.save(existing)
      }

      var token2 = existing.newAuthToken()
      return e.json(200, { token: token2, record: existing })
    }

    // Create new user with default role
    var collection = $app.findCollectionByNameOrId('users')
    var newUser = new Record(collection)
    newUser.set('email', oauthUser.email)
    newUser.set('name', oauthUser.name || '')
    newUser.set('role', 'admin')
    newUser.set('verified', true)
    newUser.setPassword($security.randomString(30))
    $app.save(newUser)

    var ea = new ExternalAuth({
      collectionRef: 'users',
      recordRef: newUser.id,
      provider: 'oidc',
      providerId: oauthUser.id,
    })
    $app.save(ea)

    var token3 = newUser.newAuthToken()
    return e.json(200, { token: token3, record: newUser })
  } catch (err) {
    $app.logger().error('Microsoft OAuth error', 'error', String(err))
    return e.json(500, { error: 'Falha na autenticação: ' + String(err) })
  }
})
