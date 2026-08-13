/**
 * Duas formas de tirar um documento da conta de progresso:
 *
 * - `land_metadata.owner_type` — proprietário é pessoa física ou jurídica. A
 *   categoria oposta inteira deixa de ser exigida, porque as duas listas nunca
 *   se aplicam à mesma terra.
 * - `document_checks.not_applicable` — dispensa avulsa de um documento
 *   específico, para o que a regra por tipo de proprietário não cobre.
 *
 * Sem isso o denominador somava PF e PJ juntas e nenhuma terra chegava a 100%.
 */
migrate(
  (app) => {
    const lands = app.findCollectionByNameOrId('land_metadata')
    if (!lands.fields.getByName('owner_type')) {
      lands.fields.add(
        new SelectField({
          name: 'owner_type',
          values: ['pf', 'pj'],
          maxSelect: 1,
        }),
      )
    }
    app.save(lands)

    const checks = app.findCollectionByNameOrId('document_checks')
    if (!checks.fields.getByName('not_applicable')) {
      checks.fields.add(new BoolField({ name: 'not_applicable' }))
    }
    app.save(checks)
  },
  (app) => {
    try {
      const lands = app.findCollectionByNameOrId('land_metadata')
      if (lands.fields.getByName('owner_type')) {
        lands.fields.removeByName('owner_type')
      }
      app.save(lands)
    } catch (_) {}

    try {
      const checks = app.findCollectionByNameOrId('document_checks')
      if (checks.fields.getByName('not_applicable')) {
        checks.fields.removeByName('not_applicable')
      }
      app.save(checks)
    } catch (_) {}
  },
)
