migrate(
  (app) => {
    // Limpeza dos envios de teste feitos antes da lista oficial de documentos
    // (migration 0042). As chaves antigas não existem mais em document_types,
    // então esses registros ficariam órfãos no banco e no histórico.
    //
    // Remove apenas os registros do PocketBase (e os arquivos anexados a eles).
    // As cópias já enviadas para o S3 NÃO são tocadas.
    var records = app.findRecordsByFilter('document_checks', "id != ''", '', 0, 0)

    for (var i = 0; i < records.length; i++) {
      app.delete(records[i])
    }

    $app.logger().info('0043_cleanup_document_checks: registros removidos', 'count', records.length)
  },
  (app) => {
    // Irreversível por natureza: os registros e seus arquivos foram apagados.
    // Não há como restaurá-los a partir desta migration.
  },
)
