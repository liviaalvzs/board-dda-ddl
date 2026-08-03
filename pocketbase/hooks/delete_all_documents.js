routerAdd(
  'POST',
  '/backend/v1/delete-all-documents',
  (e) => {
    if (!e.auth || e.auth.getString('role') !== 'admin') {
      return e.forbiddenError('Apenas administradores podem excluir todos os documentos.')
    }

    try {
      var records = $app.findRecordsByFilter('document_checks', "id != ''", '', 0, 0)
      var cleared = 0

      for (var i = 0; i < records.length; i++) {
        var record = records[i]
        var hasFile = record.getString('document_file') !== ''
        var hasUrl = record.getString('document_url') !== ''

        if (hasFile) {
          // PocketBase file fields must be cleared with null (or []),
          // not an empty string — '' is silently rejected and the old
          // file reference persists.
          record.set('document_file', null)
        }
        if (hasUrl) {
          record.set('document_url', '')
        }

        if (hasFile || hasUrl) {
          record.set('is_completed', false)
          try {
            $app.saveNoValidate(record)
            cleared++
          } catch (saveErr) {
            $app
              .logger()
              .error(
                'delete-all-documents: failed to clear record',
                'id',
                record.id,
                'error',
                String(saveErr),
              )
          }
        }
      }

      $app
        .logger()
        .info(
          '[Admin] All uploaded documents deleted from document_checks',
          'total_records',
          records.length,
          'cleared',
          cleared,
        )

      return e.json(200, { success: true, totalRecords: records.length, cleared: cleared })
    } catch (err) {
      $app.logger().error('Delete all documents failed', 'error', String(err))
      return e.json(500, {
        error: 'Falha ao excluir documentos. Tente novamente.',
      })
    }
  },
  $apis.requireAuth(),
)
