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
          required: false,
          maxSelect: 1,
          values: ['pf', 'pj'],
        }),
      )
    }
    app.save(lands)

    const checks = app.findCollectionByNameOrId('document_checks')
    if (!checks.fields.getByName('not_applicable')) {
      checks.fields.add(new BoolField({ name: 'not_applicable', required: false }))
    }
    app.save(checks)
  },
  (app) => {
    const lands = app.findCollectionByNameOrId('land_metadata')
    try {
      lands.fields.removeByName('owner_type')
    } catch (_) {}
    app.save(lands)

    const checks = app.findCollectionByNameOrId('document_checks')
    try {
      checks.fields.removeByName('not_applicable')
    } catch (_) {}
    app.save(checks)
  },
)
