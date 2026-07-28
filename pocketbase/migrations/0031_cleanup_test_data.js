migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('land_metadata')
    const landRecords = app.findRecordsByFilter(
      'land_metadata',
      "cluster_serial = '' || cluster_serial = null || external_id = '' || external_id = null",
      '-created',
      0,
      0,
    )
    let deletedLands = 0
    for (const record of landRecords) {
      try {
        app.delete(record)
        deletedLands++
      } catch (_) {}
    }

    const docCol = app.findCollectionByNameOrId('document_checks')
    let deletedDocs = 0
    try {
      const docRecords = app.findRecordsByFilter('document_checks', '1 = 1', '-created', 0, 0)
      for (const record of docRecords) {
        try {
          app.delete(record)
          deletedDocs++
        } catch (_) {}
      }
    } catch (_) {}

    console.log(
      '[0031_cleanup_test_data] Deleted ' +
        deletedLands +
        ' incomplete land_metadata records and ' +
        deletedDocs +
        ' document_checks records.',
    )
  },
  (app) => {
    // Irreversible data cleanup — no down migration needed.
    // Re-running the up migration is idempotent and safe.
  },
)
