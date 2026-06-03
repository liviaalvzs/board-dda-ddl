migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    let userRecord
    try {
      userRecord = app.findAuthRecordByEmail('_pb_users_auth_', 'livia.santana@re.green')
    } catch (_) {
      userRecord = new Record(users)
      userRecord.setEmail('livia.santana@re.green')
      userRecord.setPassword('Skip@Pass')
      userRecord.setVerified(true)
      userRecord.set('name', 'Admin')
      app.save(userRecord)
    }

    const metadataCol = app.findCollectionByNameOrId('land_metadata')
    let metadataRecord
    try {
      metadataRecord = app.findFirstRecordByData('land_metadata', 'external_id', '1')
    } catch (_) {
      metadataRecord = new Record(metadataCol)
      metadataRecord.set('external_id', '1')
      metadataRecord.set('status', 'info')
      app.save(metadataRecord)
    }

    const commentsCol = app.findCollectionByNameOrId('comments')
    try {
      app.findFirstRecordByData('comments', 'land_id', '1')
    } catch (_) {
      const comment = new Record(commentsCol)
      comment.set('land_id', '1')
      comment.set('user', userRecord.id)
      comment.set('content', 'Initial analysis seems promising. Checking the area constraints.')
      app.save(comment)
    }
  },
  (app) => {
    try {
      const c = app.findFirstRecordByData('comments', 'land_id', '1')
      app.delete(c)
    } catch (_) {}
    try {
      const m = app.findFirstRecordByData('land_metadata', 'external_id', '1')
      app.delete(m)
    } catch (_) {}
  },
)
