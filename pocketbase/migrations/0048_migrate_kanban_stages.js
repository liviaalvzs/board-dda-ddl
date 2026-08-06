migrate(
  (app) => {
    // Reestruturação do fluxo de diligência: converte a etapa de cada terra da
    // nomenclatura antiga para a nova. Sem isso, as terras ficariam com um
    // status que não corresponde a nenhuma coluna e sumiriam do board.
    //
    // 'reprovado' não tem equivalente no fluxo novo e é deixado intocado de
    // propósito — forçá-lo para outra etapa inventaria uma informação errada.
    // O mesmo vale para qualquer valor fora deste mapa; ambos são contados e
    // logados no fim para decisão manual.
    var STAGE_MAP = {
      'assinatura-carta': 'triagem-documentos-basicos',
      prospeccao: 'triagem-documentos-basicos',
      'analise-tecnica': 'triagem-documentos-basicos',
      'aguardando-doc': 'aguardando-documentos-basicos',
      'dda-analise': 'auditoria-escritorio-externo',
      'analise-interna-preliminar': 'recebimento-ddl-preliminar',
      'dd-conclusiva': 'auditoria-escritorio-externo-conclusiva',
      'analise-interna-conclusiva': 'recebimento-ddl-conclusiva',
      'proposta-assinada': 'assinado-acompanhamento-cp',
      aprovado: 'assinado-acompanhamento-cp',
      // 'emissao-certidoes' mantém o mesmo id no fluxo novo — nada a fazer.
    }

    var VALID_NEW = {
      'triagem-documentos-basicos': true,
      'aguardando-documentos-basicos': true,
      'emissao-certidoes': true,
      'auditoria-escritorio-externo': true,
      'recebimento-ddl-preliminar': true,
      'levantamento-documentos-complementares': true,
      'auditoria-escritorio-externo-conclusiva': true,
      'recebimento-ddl-conclusiva': true,
      'preparar-comite': true,
      'alinhamento-juridico-terras': true,
      'elaboracao-contrato': true,
      'assinado-acompanhamento-cp': true,
    }

    var records = app.findRecordsByFilter('land_metadata', "status != ''", '', 0, 0)

    var converted = {}
    var untouched = {}
    var totalConverted = 0

    for (var i = 0; i < records.length; i++) {
      var record = records[i]
      var current = record.getString('status')
      if (!current) continue

      if (VALID_NEW[current]) continue

      var target = STAGE_MAP[current]
      if (!target) {
        untouched[current] = (untouched[current] || 0) + 1
        continue
      }

      record.set('status', target)
      app.save(record)

      var key = current + ' -> ' + target
      converted[key] = (converted[key] || 0) + 1
      totalConverted++
    }

    app
      .logger()
      .info(
        '0048_migrate_kanban_stages: etapas convertidas',
        'total',
        totalConverted,
        'por_regra',
        JSON.stringify(converted),
        'sem_equivalente',
        JSON.stringify(untouched),
      )
  },
  (app) => {
    // Caminho inverso. As regras que colapsavam várias etapas antigas em uma só
    // (ex.: prospeccao e analise-tecnica -> triagem) não são reversíveis: a
    // volta escolhe um único destino, o mais representativo.
    var REVERSE_MAP = {
      'triagem-documentos-basicos': 'assinatura-carta',
      'aguardando-documentos-basicos': 'aguardando-doc',
      'auditoria-escritorio-externo': 'dda-analise',
      'recebimento-ddl-preliminar': 'analise-interna-preliminar',
      'auditoria-escritorio-externo-conclusiva': 'dd-conclusiva',
      'recebimento-ddl-conclusiva': 'analise-interna-conclusiva',
      'assinado-acompanhamento-cp': 'proposta-assinada',
    }

    var records = app.findRecordsByFilter('land_metadata', "status != ''", '', 0, 0)
    for (var i = 0; i < records.length; i++) {
      var record = records[i]
      var target = REVERSE_MAP[record.getString('status')]
      if (!target) continue
      record.set('status', target)
      app.save(record)
    }
  },
)
