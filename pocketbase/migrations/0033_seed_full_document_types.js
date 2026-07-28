migrate(
  (app) => {
    try {
      app.findFirstRecordByData('app_settings', 'key', 'document_types')
    } catch (_) {
      const col = app.findCollectionByNameOrId('app_settings')
      const record = new Record(col)
      record.set('key', 'document_types')
      record.set(
        'value',
        '[{"key":"certidao_matricula","label":"Certidão de Matrícula"},{"key":"iptu","label":"IPTU"},{"key":"car","label":"CAR"},{"key":"licenca_ambiental","label":"Licença Ambiental"},{"key":"escritura_compra_venda","label":"Escritura de Compra e Venda"},{"key":"certidao_onus_reais","label":"Certidão de Ônus Reais"},{"key":"cnd_federal","label":"CND Federal"},{"key":"cnd_estadual","label":"CND Estadual"},{"key":"cnd_municipal","label":"CND Municipal"},{"key":"certidao_fracao_ideal","label":"Certidão de Fração Ideal"}]',
      )
      app.save(record)
    }
  },
  (app) => {
    try {
      const record = app.findFirstRecordByData('app_settings', 'key', 'document_types')
      app.delete(record)
    } catch (_) {}
  },
)
