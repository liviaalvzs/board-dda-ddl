/// <reference path="../pb_data/types.d.ts" />

routerAdd(
  'POST',
  '/backend/v1/land-assistant/chat',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')

    const body = e.requestInfo().body || {}
    if (!body.message?.trim()) return e.badRequestError('message is required')

    const conv = $ai.agent('land-assistant').getOrCreateConversation({
      user_id: userId,
      id: body.conversation_id || null,
    })

    const iter = $ai.agent('land-assistant').chat({
      user_id: userId,
      conversation_id: conv.id,
      message: body.message,
      stream: true,
    })

    e.response.header().set('Content-Type', 'text/event-stream')
    e.response.header().set('Cache-Control', 'no-cache')
    e.response.header().set('X-Conversation-Id', conv.id)
    $response.stream(e, iter)
  },
  $apis.requireAuth(),
)

routerAdd(
  'GET',
  '/backend/v1/land-assistant/conversations',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')

    const result = $ai.agent('land-assistant').listConversations({
      user_id: userId,
      limit: 20,
    })

    return e.json(200, result)
  },
  $apis.requireAuth(),
)

routerAdd(
  'GET',
  '/backend/v1/land-assistant/conversations/:conversationId/messages',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')

    const conversationId = e.request.pathValue('conversationId')
    if (!conversationId) return e.badRequestError('conversationId is required')

    const result = $ai.agent('land-assistant').listMessages({
      conversation_id: conversationId,
      user_id: userId,
      limit: 100,
    })

    return e.json(200, result)
  },
  $apis.requireAuth(),
)
