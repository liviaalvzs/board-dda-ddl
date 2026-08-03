routerAdd('POST', '/backend/v1/negociador-login', (e) => {
  const body = e.requestInfo().body || {}
  const email = String(body.email || '')
    .trim()
    .toLowerCase()

  if (!email) return e.badRequestError('Informe o e-mail')

  let record
  try {
    record = $app.findAuthRecordByEmail('_pb_users_auth_', email)
  } catch (_) {
    // Mensagem propositalmente genérica: não confirmamos se o e-mail existe.
    return e.badRequestError('E-mail não cadastrado. Fale com um administrador.')
  }

  // O login sem senha vale SOMENTE para negociador. Contas admin continuam
  // exigindo senha — sem esta checagem, a rota seria um bypass total da
  // autenticação para o sistema inteiro.
  if (record.getString('role') !== 'negociador') {
    return e.badRequestError('Esta conta precisa entrar com e-mail e senha.')
  }

  $app.logger().info('negociador-login: acesso concedido', 'email', email, 'id', record.id)

  return $apis.recordAuthResponse(e, record)
})
