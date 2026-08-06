// Carimba a data de entrada na etapa sempre que o status muda.
//
// Hook de modelo (pré-commit): a alteração entra no mesmo save que disparou o
// hook, então não há segunda gravação nem risco de recursão — que existiria se
// isso fosse feito em onRecordAfterUpdateSuccess com um $app.save().
onRecordUpdate((e) => {
  try {
    var original = e.record.original()
    var previous = original.getString('status')
    var current = e.record.getString('status')

    if (current && previous !== current) {
      var dates = e.record.get('stage_dates')
      if (typeof dates === 'string') {
        try {
          dates = JSON.parse(dates)
        } catch (_) {
          dates = {}
        }
      }
      if (!dates || typeof dates !== 'object') dates = {}

      // Sempre sobrescreve: mover o card para uma etapa define a entrada como
      // agora, mesmo que a terra já tenha passado por ela antes.
      dates[current] = new Date().toISOString()
      e.record.set('stage_dates', dates)
    }
  } catch (err) {
    $app.logger().warn('stamp_stage_date: falha ao carimbar etapa', 'error', String(err))
  }

  return e.next()
}, 'land_metadata')
