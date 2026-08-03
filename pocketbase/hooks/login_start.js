routerAdd('POST', '/backend/v1/login-start', (e) => {
  const body = e.requestInfo().body || {}
  const email = String(body.email || '')
    .trim()
    .toLowerCase()

  if (!email) return e.badRequestError('Informe o e-mail')

  let record
  try {
    record = $app.findAuthRecordByEmail('_pb_users_auth_', email)
  } catch (_) {
    return e.badRequestError('E-mail não cadastrado. Fale com um administrador.')
  }

  // Negociador entra direto: o e-mail é o único fator. Qualquer outro papel
  // (admin) precisa da senha — sem essa separação, esta rota seria um bypass
  // completo da autenticação do sistema.
  if (record.getString('role') === 'negociador') {
    $app.logger().info('login-start: negociador autenticado', 'email', email, 'id', record.id)
    return $apis.recordAuthResponse(e, record)
  }

  return e.json(200, { requiresPassword: true })
})
