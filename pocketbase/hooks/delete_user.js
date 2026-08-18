routerAdd(
  'DELETE',
  '/backend/v1/users/{id}',
  (e) => {
    try {
      const id = e.request.pathValue('id')
      if (!id) return e.badRequestError('User id is required')

      const authRecord = e.requestInfo().authRecord
      if (!authRecord) return e.json(401, { error: 'Unauthorized' })

      // Impede que um usuário exclua a si mesmo
      if (authRecord.id === id) {
        return e.json(400, { error: 'Você não pode excluir o seu próprio usuário.' })
      }

      // Apenas administradores podem excluir usuários
      const role = authRecord.getString('role') || 'negociador'
      if (role !== 'admin') {
        return e.json(403, { error: 'Apenas administradores podem excluir usuários.' })
      }

      let record
      try {
        record = $app.findRecordById('users', id)
      } catch (_) {
        return e.json(404, { error: 'Usuário não encontrado.' })
      }

      $app.delete(record)

      return e.json(200, { success: true, id: id })
    } catch (err) {
      $app.logger().error('delete_user — failed to delete user', 'error', String(err))
      return e.json(500, { error: 'Failed to delete user' })
    }
  },
  $apis.requireAuth(),
)
