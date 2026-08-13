routerAdd(
  'POST',
  '/backend/v1/reset-all-lands',
  (e) => {
    // land_subjects entra junto: deixá-la para trás faria os proprietários e
    // matrículas antigos ressuscitarem quando a terra fosse reimportada com o
    // mesmo external_id, multiplicando documentos que ninguém cadastrou.
    const collections = [
      'comments',
      'document_checks',
      'history_logs',
      'land_subjects',
      'land_metadata',
    ]
    const counts = {}

    try {
      for (const colName of collections) {
        try {
          const row = new DynamicModel({ cnt: 0 })
          $app
            .db()
            .newQuery('SELECT COUNT(*) as cnt FROM `' + colName + '`')
            .one(row)
          counts[colName] = row.cnt || 0
        } catch (_) {
          counts[colName] = 0
        }
        $app
          .db()
          .newQuery('DELETE FROM `' + colName + '`')
          .execute()
      }

      $app
        .logger()
        .info(
          '[Admin] All lands reset',
          'comments',
          counts.comments || 0,
          'document_checks',
          counts.document_checks || 0,
          'history_logs',
          counts.history_logs || 0,
          'land_subjects',
          counts.land_subjects || 0,
          'land_metadata',
          counts.land_metadata || 0,
        )

      return e.json(200, { success: true, counts })
    } catch (err) {
      $app.logger().error('Reset all lands failed', 'error', String(err))
      return e.json(500, { error: 'Reset failed. Please try again.' })
    }
  },
  $apis.requireSuperuserAuth(),
)
