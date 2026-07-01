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

  if (original.getString('owner_marital_status') !== current.getString('owner_marital_status')) {
    changes.push({
      field: 'owner_marital_status',
      old: original.getString('owner_marital_status') || 'N/A',
      new: current.getString('owner_marital_status') || 'N/A',
    })
  }

  if (original.getString('risk_level') !== current.getString('risk_level')) {
    changes.push({
      field: 'risk_level',
      old: original.getString('risk_level') || 'N/A',
      new: current.getString('risk_level') || 'N/A',
    })
  }

  if (original.getString('dda_status') !== current.getString('dda_status')) {
    changes.push({
      field: 'dda_status',
      old: original.getString('dda_status') || 'N/A',
      new: current.getString('dda_status') || 'N/A',
    })
  }

  if (changes.length > 0) {
    const fieldLabels = {
      status: 'Status',
      responsible_user: 'Responsável',
      external_offices: 'Escritório Externo',
      owner_marital_status: 'Estado Civil',
      risk_level: 'Nível de Risco',
      dda_status: 'Status DDA',
    }
    const historyCol = $app.findCollectionByNameOrId('history_logs')
    for (const change of changes) {
      const logRecord = new Record(historyCol)
      logRecord.set('land_id', landId)
      logRecord.set('user_id', userId)
      logRecord.set('action_description', `Alterou ${fieldLabels[change.field] || change.field}`)
      logRecord.set('change_details', change)
      $app.save(logRecord)
    }
  }

  return e.next()
}, 'land_metadata')
