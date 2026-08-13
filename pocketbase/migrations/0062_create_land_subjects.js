/**
 * Múltiplos proprietários e matrículas por terra.
 *
 * Cada "sujeito" (proprietário ou matrícula) tem a sua própria lista de
 * documentos, então `document_checks` deixa de ser um por tipo e passa a ser um
 * por tipo POR sujeito. O índice único acompanha.
 *
 * `subject_id` é text, e não relação, por dois motivos: acompanha o estilo de
 * `land_id` (também text), e garante string vazia em vez de NULL — em índice
 * único do SQLite, NULL é sempre distinto de NULL, então documentos sem sujeito
 * escapariam da restrição e duplicariam em silêncio.
 */
const PF_CATEGORY = 'Pessoa Física (proprietário e cônjuge)'
const PJ_CATEGORY = 'Pessoa Jurídica'

/** Categorias de proprietário multiplicam por dono; o resto, por matrícula. */
function kindForCategory(category) {
  return category === PF_CATEGORY || category === PJ_CATEGORY ? 'owner' : 'matricula'
}

migrate(
  (app) => {
    const subjects = new Collection({
      name: 'land_subjects',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: '@request.auth.role = "admin"',
      updateRule: '@request.auth.role = "admin"',
      deleteRule: '@request.auth.role = "admin"',
      fields: [
        { name: 'land_id', type: 'text', required: true },
        { name: 'kind', type: 'select', maxSelect: 1, values: ['owner', 'matricula'] },
        { name: 'label', type: 'text', required: true },
        // Só vale para kind=owner. Vazio herda o owner_type da terra.
        { name: 'owner_type', type: 'select', maxSelect: 1, values: ['pf', 'pj'] },
        { name: 'sort_order', type: 'number', onlyInt: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_land_subjects_land_id ON land_subjects (land_id)'],
    })
    app.save(subjects)

    const checks = app.findCollectionByNameOrId('document_checks')
    if (!checks.fields.getByName('subject_id')) {
      checks.fields.add(new TextField({ name: 'subject_id' }))
    }
    // Sai o par, entra a trinca. As linhas existentes ficam com subject_id ''
    // e continuam únicas entre si, então a troca não conflita com nada.
    try {
      checks.removeIndex('idx_document_checks_unique')
    } catch (_) {}
    checks.addIndex('idx_document_checks_unique', true, 'land_id, document_key, subject_id', '')
    app.save(checks)

    // ── Backfill ────────────────────────────────────────────────────────────
    // Toda terra que já tem documento ganha um proprietário e uma matrícula
    // iniciais, e os registros existentes são distribuídos pela categoria do
    // seu tipo. Nomes genéricos porque não temos o nome real em lugar nenhum;
    // renomear na tela é trivial.
    let categoryByKey = {}
    try {
      const types = app.findRecordsByFilter('document_types', "id != ''", '', 0, 0)
      for (const type of types) {
        categoryByKey[type.getString('key')] = type.getString('category')
      }
    } catch (err) {
      app.logger().warn('0062: não foi possível ler document_types', 'erro', String(err))
    }

    let ownerTypeByLand = {}
    try {
      const lands = app.findRecordsByFilter('land_metadata', "external_id != ''", '', 0, 0)
      for (const land of lands) {
        ownerTypeByLand[land.getString('external_id')] = land.getString('owner_type') || ''
      }
    } catch (_) {}

    let allChecks = []
    try {
      allChecks = app.findRecordsByFilter('document_checks', "land_id != ''", '', 0, 0)
    } catch (err) {
      app.logger().warn('0062: não foi possível ler document_checks', 'erro', String(err))
      return
    }

    const subjectsCol = app.findCollectionByNameOrId('land_subjects')
    const createdByLand = {}
    let assigned = 0

    for (const check of allChecks) {
      const landId = check.getString('land_id')
      if (!landId) continue

      if (!createdByLand[landId]) {
        const owner = new Record(subjectsCol)
        owner.set('land_id', landId)
        owner.set('kind', 'owner')
        owner.set('label', 'Proprietário 1')
        owner.set('owner_type', ownerTypeByLand[landId] || '')
        owner.set('sort_order', 10)
        app.save(owner)

        const matricula = new Record(subjectsCol)
        matricula.set('land_id', landId)
        matricula.set('kind', 'matricula')
        matricula.set('label', 'Matrícula 1')
        matricula.set('sort_order', 10)
        app.save(matricula)

        createdByLand[landId] = { owner: owner.id, matricula: matricula.id }
      }

      const kind = kindForCategory(categoryByKey[check.getString('document_key')])
      try {
        check.set('subject_id', createdByLand[landId][kind])
        app.save(check)
        assigned++
      } catch (err) {
        app.logger().warn('0062: falha ao atribuir sujeito', 'check', check.id, 'erro', String(err))
      }
    }

    app
      .logger()
      .info(
        '0062_create_land_subjects: backfill concluído',
        'terras',
        Object.keys(createdByLand).length,
        'documentos_atribuidos',
        assigned,
      )
  },
  (app) => {
    const checks = app.findCollectionByNameOrId('document_checks')
    try {
      checks.removeIndex('idx_document_checks_unique')
    } catch (_) {}
    // Devolver o par exige que não haja duplicata por tipo; limpar antes.
    try {
      const seen = {}
      const all = app.findRecordsByFilter('document_checks', "land_id != ''", '', 0, 0)
      for (const check of all) {
        const pair = check.getString('land_id') + '::' + check.getString('document_key')
        if (seen[pair]) {
          app.delete(check)
          continue
        }
        seen[pair] = true
        check.set('subject_id', '')
        app.save(check)
      }
    } catch (_) {}
    try {
      checks.fields.removeByName('subject_id')
    } catch (_) {}
    checks.addIndex('idx_document_checks_unique', true, 'land_id, document_key', '')
    app.save(checks)

    try {
      const subjects = app.findCollectionByNameOrId('land_subjects')
      app.delete(subjects)
    } catch (_) {}
  },
)
