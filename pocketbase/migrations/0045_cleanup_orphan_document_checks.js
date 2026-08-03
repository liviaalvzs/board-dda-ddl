migrate(
  (app) => {
    // Remove os registros órfãos deixados pelo fluxo antigo, em que o frontend
    // criava a linha em document_checks antes de tentar o upload: quando o envio
    // falhava, sobrava uma linha sem arquivo, que aparecia no histórico como
    // "enviado" e sem autor.
    //
    // Uma linha sem document_file E sem document_url nunca representa um envio
    // bem-sucedido, então é seguro apagá-la. A partir da versão atual o hook cria
    // o registro dentro da própria operação de upload e o desfaz em caso de erro.
    var orphans = app.findRecordsByFilter(
      'document_checks',
      'document_file = "" && document_url = ""',
      '',
      0,
      0,
    )

    for (var i = 0; i < orphans.length; i++) {
      app.delete(orphans[i])
    }

    app.logger().info('0045_cleanup_orphan_document_checks: removidos', 'count', orphans.length)
  },
  (app) => {
    // Irreversível: os registros apagados não continham arquivo nem URL, então
    // não há o que restaurar.
  },
)
