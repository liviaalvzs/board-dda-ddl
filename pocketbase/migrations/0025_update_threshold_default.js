migrate(
  (app) => {
    try {
      const record = app.findFirstRecordByData('app_settings', 'key', 'delayed_threshold_days')
      record.set('value', '7')
      app.save(record)
    } catch (_) {
      const col = app.findCollectionByNameOrId('app_settings')
      const record = new Record(col)
      record.set('key', 'delayed_threshold_days')
      record.set('value', '7')
      app.save(record)
    }
  },
  (app) => {
    try {
      const record = app.findFirstRecordByData('app_settings', 'key', 'delayed_threshold_days')
      record.set('value', '30')
      app.save(record)
    } catch (_) {}
  },
)
