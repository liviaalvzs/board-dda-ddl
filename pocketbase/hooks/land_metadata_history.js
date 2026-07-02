onRecordAfterUpdateSuccess((e) => {
  const original = e.record.original()
  const current = e.record
  const landId = current.getString('external_id')
  const userId = e.requestInfo().auth?.id

  if (!userId) return e.next()

  function getRelId(record, fieldName) {
    var val = record.get(fieldName)
    if (val === null || val === undefined || val === '') return ''
    if (Array.isArray(val)) return val[0] || ''
    return String(val)
  }

  const changes = []

  if (original.getString('status') !== current.getString('status')) {
    changes.push({
      field: 'status',
      old: original.getString('status') || 'N/A',
      new: current.getString('status') || 'N/A',
    })
  }

  const oldResp = getRelId(original, 'responsible_user')
  const newResp = getRelId(current, 'responsible_user')
  if (oldResp !== newResp) {
    let oldName = 'N/A'
    let newName = 'N/A'
    try {
      if (oldResp) {
        const u = $app.findRecordById('users', oldResp)
        oldName = u.getString('name') || u.getString('email')
      }
    } catch (_) {}
    try {
      if (newResp) {
        const u = $app.findRecordById('users', newResp)
        newName = u.getString('name') || u.getString('email')
      }
    } catch (_) {}
    changes.push({ field: 'responsible_user', old: oldName, new: newName })
  }

  const oldOffice = getRelId(original, 'external_offices')
  const newOffice = getRelId(current, 'external_offices')
  if (oldOffice !== newOffice) {
    let oldName = 'N/A'
    let newName = 'N/A'
    try {
      if (oldOffice) {
        const o = $app.findRecordById('external_offices', oldOffice)
        oldName = o.getString('name')
      }
    } catch (_) {}
    try {
      if (newOffice) {
        const o = $app.findRecordById('external_offices', newOffice)
        newName = o.getString('name')
      }
    } catch (_) {}
    changes.push({ field: 'external_offices', old: oldName, new: newName })
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
