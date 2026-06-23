onRecordAfterUpdateSuccess((e) => {
  const original = e.record.original()
  const current = e.record
  const landId = current.getString('external_id')
  const userId = e.requestInfo().auth?.id

  if (!userId) return e.next()

  const changes = []

  if (original.getString('status') !== current.getString('status')) {
    changes.push({
      field: 'status',
      old: original.getString('status') || 'N/A',
      new: current.getString('status') || 'N/A',
    })
  }

  if (original.getString('responsible_user') !== current.getString('responsible_user')) {
    let oldName = 'N/A'
    let newName = 'N/A'
    try {
      if (original.getString('responsible_user')) {
        const u = $app.findRecordById('users', original.getString('responsible_user'))
        oldName = u.getString('name') || u.getString('email')
      }
    } catch (_) {}
    try {
      if (current.getString('responsible_user')) {
        const u = $app.findRecordById('users', current.getString('responsible_user'))
        newName = u.getString('name') || u.getString('email')
      }
    } catch (_) {}

    changes.push({
      field: 'responsible_user',
      old: oldName,
      new: newName,
    })
  }

  if (original.getString('external_offices') !== current.getString('external_offices')) {
    let oldName = 'N/A'
    let newName = 'N/A'
    try {
      if (original.getString('external_offices')) {
        const o = $app.findRecordById('external_offices', original.getString('external_offices'))
        oldName = o.getString('name')
      }
    } catch (_) {}
    try {
      if (current.getString('external_offices')) {
        const o = $app.findRecordById('external_offices', current.getString('external_offices'))
        newName = o.getString('name')
      }
    } catch (_) {}

    changes.push({
      field: 'external_offices',
      old: oldName,
      new: newName,
    })
  }

  if (changes.length > 0) {
    const historyCol = $app.findCollectionByNameOrId('history_logs')
    for (const change of changes) {
      const logRecord = new Record(historyCol)
      logRecord.set('land_id', landId)
      logRecord.set('user_id', userId)
      logRecord.set('action_description', `Alterou ${change.field}`)
      logRecord.set('change_details', change)
      $app.save(logRecord)
    }
  }

  return e.next()
}, 'land_metadata')
