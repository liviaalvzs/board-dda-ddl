/**
 * Substitui os quatro campos de "DDL preliminar" / "DDL conclusiva" por um
 * único par estimado → recebido, espelhando a Diligência Ambiental.
 *
 * Os dados existentes são migrados ANTES de as colunas antigas serem removidas:
 * a conclusiva é a correspondência exata (estimativa de recebimento →
 * recebimento efetivo) e a preliminar entra só onde a conclusiva está vazia,
 * para não perder o histórico das terras que ainda não chegaram lá.
 */
const LEGACY_FIELDS = [
  'data_pedido_inicio_ddl',
  'data_recebimento_preliminar_ddm',
  'data_estimada_recebimento_ddl_conclusiva',
  'data_recebimento_dd_conclusiva',
]

/** Leitura blindada: campo de data no JSVM não volta como string comum. */
function readDate(record, name) {
  try {
    const raw = record.get(name)
    if (!raw) return ''
    const text = String(raw)
    return text && text !== 'null' && text !== 'undefined' ? text : ''
  } catch (_) {
    return ''
  }
}

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('land_metadata')

    if (!col.fields.getByName('data_estimada_ddl')) {
      col.fields.add(new DateField({ name: 'data_estimada_ddl', required: false }))
    }
    if (!col.fields.getByName('data_recebimento_ddl')) {
      col.fields.add(new DateField({ name: 'data_recebimento_ddl', required: false }))
    }
    col.addIndex('idx_land_metadata_data_estimada_ddl', false, 'data_estimada_ddl', '')
    col.addIndex('idx_land_metadata_data_recebimento_ddl', false, 'data_recebimento_ddl', '')
    app.save(col)

    let migrated = 0
    try {
      const records = app.findRecordsByFilter('land_metadata', "external_id != ''", '', 0, 0)
      for (const record of records) {
        const planned =
          readDate(record, 'data_estimada_recebimento_ddl_conclusiva') ||
          readDate(record, 'data_pedido_inicio_ddl')
        const actual =
          readDate(record, 'data_recebimento_dd_conclusiva') ||
          readDate(record, 'data_recebimento_preliminar_ddm')

        if (!planned && !actual) continue

        if (planned) record.set('data_estimada_ddl', planned)
        if (actual) record.set('data_recebimento_ddl', actual)
        app.save(record)
        migrated++
      }
    } catch (err) {
      app.logger().warn('0058_replace_ddl_fields: falha ao migrar datas', 'erro', String(err))
    }

    app.logger().info('0058_replace_ddl_fields: datas migradas', 'registros', migrated)

    // Só depois de migrar é que as colunas antigas saem.
    const cleaned = app.findCollectionByNameOrId('land_metadata')
    for (const name of LEGACY_FIELDS) {
      try {
        cleaned.fields.removeByName(name)
      } catch (_) {}
    }
    app.save(cleaned)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('land_metadata')
    for (const name of LEGACY_FIELDS) {
      if (!col.fields.getByName(name)) {
        col.fields.add(new DateField({ name, required: false }))
      }
    }
    app.save(col)

    // Devolve os valores para a conclusiva, que foi a origem preferencial.
    try {
      const records = app.findRecordsByFilter('land_metadata', "external_id != ''", '', 0, 0)
      for (const record of records) {
        const planned = readDate(record, 'data_estimada_ddl')
        const actual = readDate(record, 'data_recebimento_ddl')
        if (!planned && !actual) continue
        if (planned) record.set('data_estimada_recebimento_ddl_conclusiva', planned)
        if (actual) record.set('data_recebimento_dd_conclusiva', actual)
        app.save(record)
      }
    } catch (_) {}

    const cleaned = app.findCollectionByNameOrId('land_metadata')
    try {
      cleaned.fields.removeByName('data_estimada_ddl')
    } catch (_) {}
    try {
      cleaned.fields.removeByName('data_recebimento_ddl')
    } catch (_) {}
    try {
      cleaned.removeIndex('idx_land_metadata_data_estimada_ddl')
    } catch (_) {}
    try {
      cleaned.removeIndex('idx_land_metadata_data_recebimento_ddl')
    } catch (_) {}
    app.save(cleaned)
  },
)
