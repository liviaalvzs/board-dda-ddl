migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('app_settings')
    try {
      app.findFirstRecordByData('app_settings', 'key', 'delayed_threshold_days')
    } catch (_) {
      const record = new Record(col)
      record.set('key', 'delayed_threshold_days')
      record.set('value', '30')
      app.save(record)
    }
  },
  (app) => {
    try {
      const record = app.findFirstRecordByData('app_settings', 'key', 'delayed_threshold_days')
      app.delete(record)
    } catch (_) {}
  },
)
