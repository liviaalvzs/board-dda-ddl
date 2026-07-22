onRecordAfterUpdateSuccess((e) => {
  try {
    const original = e.record.original()
    const current = e.record
    const landId = current.getString('external_id')

    var userId = ''
    try {
      var auth = e.requestInfo().auth
      if (auth) {
        userId = auth.id || ''
      }
    } catch (_) {}

    if (!userId) return e.next()

    function getRelId(record, fieldName) {
      var val = record.get(fieldName)
      if (val === null || val === undefined || val === '') return ''
      if (Array.isArray(val)) return val[0] || ''
      return String(val)
    }

    const changes = []

    var oldResp = getRelId(original, 'responsible_user')
    var newResp = getRelId(current, 'responsible_user')
    if (oldResp !== newResp) {
      var oldName = 'N/A'
      var newName = 'N/A'
      try {
        if (oldResp) {
          var u = $app.findRecordById('users', oldResp)
          oldName = u.getString('name') || u.getString('email')
        }
      } catch (_) {}
      try {
        if (newResp) {
          var u2 = $app.findRecordById('users', newResp)
          newName = u2.getString('name') || u2.getString('email')
        }
      } catch (_) {}
      changes.push({ field: 'responsible_user', old: oldName, new: newName })
    }

    var oldOffice = getRelId(original, 'external_offices')
    var newOffice = getRelId(current, 'external_offices')
    if (oldOffice !== newOffice) {
      var oldOfficeName = 'N/A'
      var newOfficeName = 'N/A'
      try {
        if (oldOffice) {
          var o = $app.findRecordById('external_offices', oldOffice)
          oldOfficeName = o.getString('name')
        }
      } catch (_) {}
      try {
        if (newOffice) {
          var o2 = $app.findRecordById('external_offices', newOffice)
          newOfficeName = o2.getString('name')
        }
      } catch (_) {}
      changes.push({ field: 'external_offices', old: oldOfficeName, new: newOfficeName })
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
      var fieldLabels = {
        responsible_user: 'Responsável',
        external_offices: 'Escritório Externo',
        owner_marital_status: 'Estado Civil',
        risk_level: 'Nível de Risco',
        dda_status: 'Status DDA',
      }
      var historyCol = $app.findCollectionByNameOrId('history_logs')
      for (var i = 0; i < changes.length; i++) {
        var change = changes[i]
        var logRecord = new Record(historyCol)
        logRecord.set('land_id', landId)
        logRecord.set('user_id', userId)
        logRecord.set(
          'action_description',
          'Alterou ' + (fieldLabels[change.field] || change.field),
        )
        logRecord.set('change_details', change)
        $app.save(logRecord)
      }
    }
  } catch (err) {
    console.log('land_metadata_history hook error:', err)
  }

  return e.next()
}, 'land_metadata')
