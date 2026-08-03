migrate(
  (app) => {
    // Re-execute the full deletion of all uploaded document files.
    // The delete_all_documents hook previously set document_file to ''
    // (empty string), which PocketBase rejects for file fields — the old
    // value was never persisted and uploaded documents still showed up.
    // This migration clears every document_checks record properly using
    // null for the file field and '' for the URL, and resets is_completed.

    var records = app.findRecordsByFilter('document_checks', "id != ''", '', 0, 0)
    var cleared = 0

    for (var i = 0; i < records.length; i++) {
      var record = records[i]
      var hasFile = record.getString('document_file') !== ''
      var hasUrl = record.getString('document_url') !== ''
      var isCompleted = record.getBool('is_completed')

      if (hasFile) {
        record.set('document_file', null)
      }
      if (hasUrl) {
        record.set('document_url', '')
      }
      if (isCompleted) {
        record.set('is_completed', false)
      }

      if (hasFile || hasUrl || isCompleted) {
        app.saveNoValidate(record)
        cleared++
      }
    }

    app
      .logger()
      .info(
        '0045_clear_all_document_files: document checks cleared',
        'total_records',
        records.length,
        'cleared',
        cleared,
      )
  },
  (app) => {
    // Irreversível: os arquivos enviados foram limpos e os flags resetados.
    // Não há como restaurá-los a partir desta migration.
  },
)
