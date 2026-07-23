routerAdd(
  'POST',
  '/backend/v1/delete-all-land-metadata',
  (e) => {
    const counts = {}

    try {
      $app.runInTransaction((txApp) => {
        const collections = ['comments', 'document_checks', 'history_logs', 'land_metadata']

        for (const colName of collections) {
          try {
            const row = new DynamicModel({ cnt: 0 })
            txApp
              .db()
              .newQuery('SELECT COUNT(*) as cnt FROM `' + colName + '`')
              .one(row)
            counts[colName] = row.cnt || 0
          } catch (_) {
            counts[colName] = 0
          }
          txApp
            .db()
            .newQuery('DELETE FROM `' + colName + '`')
            .execute()
        }
      })

      $app
        .logger()
        .info(
          '[Admin] All land metadata deleted (no reimport)',
          'comments',
          counts.comments || 0,
          'document_checks',
          counts.document_checks || 0,
          'history_logs',
          counts.history_logs || 0,
          'land_metadata',
          counts.land_metadata || 0,
        )

      return e.json(200, { success: true, counts })
    } catch (err) {
      $app.logger().error('Delete all land metadata failed', 'error', String(err))
      return e.json(500, {
        error: 'Delete failed. Data may be in an inconsistent state. Please try again.',
      })
    }
  },
  $apis.requireSuperuserAuth(),
)
